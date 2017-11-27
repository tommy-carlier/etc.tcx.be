(function(){
  "use strict";

  var w = window, d = document;
  
  if(!(w.localStorage && w.JSON && w.XMLHttpRequest)) {
    return;
  }

  function loadOrMigrate(newName, oldName) {
    var v = localStorage[newName];
    if(!v && oldName) {
      v = localStorage[oldName];
      if(v) {
        localStorage.setItem(newName, v);
        localStorage.removeItem(oldName);
      }
    }
    return v;
  }

  function loadJson(newName, oldName) {
    var s = loadOrMigrate(newName, oldName);
    if(s) {
      try {
        return JSON.parse(s);
      } catch(e) { /* parsing failed */}
    }
    return ({ });
  }
  
  function saveJson(name, json) {
    try {
      localStorage.setItem(name, JSON.stringify(json));
    } catch(e) { /* storage failed */ }
  }

  var lijstTeLezenBoeken = d.getElementById('lijstTeLezenBoeken');

  function append(p,tag,cls,txt) {
    var e = d.createElement(tag);
    if(cls && cls.length) e.className = cls; // can contain spaces
    if(txt && txt.length) e.appendChild(d.createTextNode(txt));
    return p.appendChild(e);
  }

  function renderBoek(lijst, boek) {
    append(lijst, 'DT', 'Title', boek.titel);
    var dd = append(lijst, 'DD');
    append(dd, 'SPAN', 'Author Sep', boek.auteur);
    if(boek.paginas > 0) append(dd, 'SPAN', 'PageCount Sep', boek.paginas + 'p');
    append(dd, 'SPAN', 'Location Sep', boek.vindplaats);
    if(boek.inReeks) append(dd, 'SPAN', 'Series', '(reeks)');
  }

  function shuffle(xs) {
    var i = xs.length, x, rnd;
    while(i) {
      rnd = Math.floor(Math.random() * i);
      i -= 1;
      x = xs[i];
      xs[i] = xs[rnd];
      xs[rnd] = x;
    }
  }

  function render(data) {
    if('boeken' in data) {
      var boeken = data.boeken,
          f = d.createDocumentFragment();

      shuffle(boeken);
      for(var n = boeken.length, i = 0; i < n; i++){
        var boek = boeken[i];
        renderBoek(f, boek);
      }

      while(lijstTeLezenBoeken.firstChild) {
        lijstTeLezenBoeken.removeChild(lijstTeLezenBoeken.firstChild);
      }

      lijstTeLezenBoeken.appendChild(f);
    }
  }

  var apiKey = loadOrMigrate('bib/apiKey', 'airtableApiKey');

  function request(url, cb) {
    var req = new XMLHttpRequest();
    req.open('GET', 'https://api.airtable.com/v0/appS3vbT8bkcbfnbt/' + url, true);
    req.setRequestHeader('Authorization', 'Bearer ' + apiKey);
    req.addEventListener('readystatechange', function() {
      if(req.readyState == 4) {
        var data = {}, err = '';
        if(req.status == 200) {
          try {
            data = JSON.parse(req.responseText);
          } catch(e) {
            err = 'Kan gegevens niet parsen';
            console.error(e);
          }
        } else {
          err = req.status ? req.statusText + ' (' + req.status + ')\n' + req.responseText : 'Server offline';
        }
        cb(data, err);
      }
    });
    req.send();
  }

  function extractAuteurs(records) {
    var auteurs = { };
    for(var n = records.length, i = 0; i < n; i++) {
      var record = records[i];
      auteurs[record.id] = record.fields.Name;
    }
    return auteurs;
  }

  function extractBoeken(records, auteurs) {
    var boeken = [];
    for(var n = records.length, i = 0; i < n; i++) {
      var fields = records[i].fields;
      var boek = {
        titel: fields.Titel,
        vindplaats: fields['Vindplaats bib'],
        auteur: '',
        inReeks: 'Reeks' in fields && fields.Reeks.length > 0,
        paginas: fields["Pagina's"]||0
      };
      if(fields.Auteur.length) {
        var auteurID = fields.Auteur[0];
        if(auteurID in auteurs) {
          boek.auteur = auteurs[auteurID];
        }
      }
      boeken.push(boek);
    }
    return boeken;
  }

  function downloadAuteurs(cb) {
    var auteurs = [];
    function reqNextPage(offset) {
      var url = 'Auteurs?fields%5B%5D=Name';
      if(offset.length) url += '&offset=' + offset;
      request(url, function(json, err) {
        if(err) {
          cb([], err);
          return;
        }

        auteurs = auteurs.concat(extractAuteurs(json.records));
        if('offset' in json) {
          reqNextPage(json.offset);
        } else cb(auteurs);
      });
    }
    reqNextPage('');
  }
  
  function startDownloadData() {
    downloadAuteurs(function(auteurs, err) {
      if(err) {
        alert(err);
        return;
      }

      request('Boeken?view=Te%20lezen%20in%20bib&fields%5B%5D=Titel&fields%5B%5D=Auteur&fields%5B%5D=Vindplaats%20bib&fields%5B%5D=Reeks&fields%5B%5D=Pagina%27s', function(json, err) {
        if(err) {
          alert(err);
          return;
        }

        var boeken = extractBoeken(json.records, auteurs);
        var data = { boeken:boeken };
        saveJson('bib/data', data)
        render(data);
      });
    });
  }

  function navigateToListScreen() {
    location.hash = 'listScreen';
    render(loadJson('bib/data', 'data'));
    if(navigator.onLine) {
      startDownloadData();
    }
  }
  
  if(apiKey) {
    navigateToListScreen();
  } else {
    location.hash = 'apiKeyScreen';
    d.getElementById('apiKeyScreen').addEventListener('submit', function(e) {
      e.preventDefault();
      apiKey = d.getElementById('apiKeyInput').value;
      if(apiKey) {
        localStorage.setItem('bib/apiKey', apiKey);
        navigateToListScreen();
      }
    });
  }
}())