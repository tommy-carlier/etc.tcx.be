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

  var lijstTeLezenBoeken = d.getElementById('lijstTeLezenBoeken'),
    lijstTeBekijkenFilms = d.getElementById('lijstTeBekijkenFilms');

  function append(p,tag,cls,txt) {
    var e = d.createElement(tag);
    if(cls && cls.length) e.className = cls; // can contain spaces
    if(txt && txt.length) e.appendChild(d.createTextNode(txt));
    return p.appendChild(e);
  }

  function renderBoek(lijst, boek) {
    append(lijst, 'DT', 'Title', boek.titel);
    var dd = append(lijst, 'DD', 'Details');
    append(dd, 'SPAN', 'Author Sep', boek.auteur);
    if(boek.paginas > 0) append(dd, 'SPAN', 'PageCount Sep', boek.paginas + 'p');
    append(dd, 'SPAN', 'Location Sep', boek.vindplaats);
    if(boek.inReeks) append(dd, 'SPAN', 'Series', '(reeks)');
  }

  function renderFilm(lijst, film) {
    append(lijst, 'DT', 'Title', film.titel);
    if(film.jaarUitgegeven > 0) {
      var dd = append(lijst, 'DD', 'Details');
      append(dd, 'SPAN', 'YearPublished', '' + film.jaarUitgegeven);
    }
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

  function renderBoeken(boeken) {
    var f = d.createDocumentFragment();

    shuffle(boeken);
    for(var n = boeken.length, i = 0; i < n; i++){
      renderBoek(f, boeken[i]);
    }

    while(lijstTeLezenBoeken.firstChild) {
      lijstTeLezenBoeken.removeChild(lijstTeLezenBoeken.firstChild);
    }

    lijstTeLezenBoeken.appendChild(f);
  }

  function renderFilms(films) {
    var f = d.createDocumentFragment();
    
    shuffle(films);
    for(var n = films.length, i = 0; i < n; i++){
      renderFilm(f, films[i]);
    }

    while(lijstTeBekijkenFilms.firstChild) {
      lijstTeBekijkenFilms.removeChild(lijstTeBekijkenFilms.firstChild);
    }

    lijstTeBekijkenFilms.appendChild(f);
  }

  var apiKey = loadOrMigrate('bib/apiKey', 'airtableApiKey');

  function request(url, cb) {
    var req = new XMLHttpRequest();
    req.open('GET', 'https://api.airtable.com/v0/' + url, true);
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

  function requestTeLezenBoeken(url, cb) {
    request('appS3vbT8bkcbfnbt/' + url, cb);
  }

  function requestTeBekijkenFilms(url, cb) {
    request('app2cUKpOgqnvXJn2/' + url, cb);
  }

  function extractAuteurs(auteurs, records) {
    for(var n = records.length, i = 0; i < n; i++) {
      var record = records[i];
      auteurs[record.id] = record.fields.Name;
    }
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

  function extractFilms(records) {
    var films = [];
    for(var n = records.length, i = 0; i < n; i++) {
      var fields = records[i].fields;
      films.push({
        titel: fields.Titel,
        jaarUitgegeven: fields['Jaar uitgegeven']||0
      });
    }
    return films;
  }

  function downloadAuteurs(cb) {
    var auteurs = {};
    function reqNextPage(offset) {
      var url = 'Auteurs?fields%5B%5D=Name';
      if(offset.length) url += '&offset=' + offset;
      requestTeLezenBoeken(url, function(json, err) {
        if(err) {
          cb([], err);
          return;
        }

        extractAuteurs(auteurs, json.records);
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

      requestTeLezenBoeken('Boeken?view=Te%20lezen%20in%20bib&fields%5B%5D=Titel&fields%5B%5D=Auteur&fields%5B%5D=Vindplaats%20bib&fields%5B%5D=Reeks&fields%5B%5D=Pagina%27s', function(json, err) {
        if(err) {
          alert(err);
          return;
        }

        var boeken = extractBoeken(json.records, auteurs);
        saveJson('bib/boeken', boeken);
        renderBoeken(boeken);
      });
    });

    requestTeBekijkenFilms('Films?view=Te%20bekijken%20in%20bib&fields%5B%5D=Titel&fields%5B%5D=Jaar%20uitgegeven', function(json, err) {
      if(err) {
        alert(err);
        return;
      }

      var films = extractFilms(json.records);
      saveJson('bib/films', films);
      renderFilms(films);
    });
  }

  function navigateToListScreen() {
    location.hash = 'listScreen';
    localStorage.removeItem('bib/data');
    renderBoeken(loadJson('bib/boeken'));
    renderFilms(loadJson('bib/films'));
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