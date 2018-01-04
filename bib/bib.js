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

  function appendTxt(p,txt) {
    p.appendChild(d.createTextNode(txt));
  }

  function append(p,tag,cls,txt) {
    var e = d.createElement(tag);
    if(cls && cls.length) e.className = cls; // can contain spaces
    if(txt && txt.length) appendTxt(e, txt);
    return p.appendChild(e);
  }

  function getBoekDetails(boek) {
    var txt = [];
    if(boek.auteur.length) txt.push(boek.auteur);
    if(boek.paginas > 0) txt.push(boek.paginas + 'p');
    txt.push(boek.vindplaats);
    return txt.join('; ');
  }

  function renderBoek(lijst, boek) {
    append(lijst, 'DT', 'Title', boek.titel);
    var dd = append(lijst, 'DD', 'Details');
    appendTxt(dd, getBoekDetails(boek));
    if(boek.inReeks) append(dd, 'SPAN', 'Series', '(reeks)');
  }

  function renderFilm(lijst, film) {
    append(lijst, 'DT', 'Title', film.titel);
    if(film.jaarUitgegeven > 0) {
      var dd = append(lijst, 'DD', 'Details');
      appendTxt(dd, film.jaarUitgegeven);
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

  function renderItems(list, items, render) {
    var f = d.createDocumentFragment();
    
    shuffle(items);
    for(var n = items.length, i = 0; i < n; i++){
      render(f, items[i]);
    }

    var range = d.createRange();
    range.selectNodeContents(list);
    range.deleteContents();
    range.detach();

    list.appendChild(f);
  }

  function renderBoeken(boeken) {
    renderItems(lijstTeLezenBoeken, boeken, renderBoek);
  }

  function renderFilms(films) {
    renderItems(lijstTeBekijkenFilms, films, renderFilm);
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

  function downloadAuteurs(auteurs, cb) {
    function reqNextPage(offset) {
      var url = 'Auteurs?view=Te%20lezen%20in%20bib&fields%5B%5D=Name';
      if(offset.length) url += '&offset=' + offset;
      requestTeLezenBoeken(url, function(json, err) {
        if(err) {
          cb(err);
          return;
        }

        extractAuteurs(auteurs, json.records);
        if('offset' in json) {
          reqNextPage(json.offset);
        } else {
          auteurs.geladen = true;
          cb();
        }
      });
    }
    reqNextPage('');
  }

  function joinBoekenAuteurs(boekRecs, auteurs) {
    var boeken = extractBoeken(boekRecs, auteurs);
    saveJson('bib/boeken', boeken);
    renderBoeken(boeken);
  }
  
  function startDownloadData() {
    var auteurs = { geladen:false }, boekRecs = [];
    
    downloadAuteurs(auteurs, function(err) {
      if(err) {
        alert('Download auteurs: ' + err);
        return;
      }
      if(boekRecs.length) joinBoekenAuteurs(boekRecs, auteurs);
    });

    requestTeLezenBoeken('Boeken?view=Te%20lezen%20in%20bib&fields%5B%5D=Titel&fields%5B%5D=Auteur&fields%5B%5D=Vindplaats%20bib&fields%5B%5D=Reeks&fields%5B%5D=Pagina%27s', function(json, err) {
      if(err) {
        alert('Download te lezen boeken: ' + err);
        return;
      }

      boekRecs = json.records;
      if(auteurs.geladen) joinBoekenAuteurs(boekRecs, auteurs);
    });

    requestTeBekijkenFilms('Films?view=Te%20bekijken%20in%20bib&fields%5B%5D=Titel&fields%5B%5D=Jaar%20uitgegeven', function(json, err) {
      if(err) {
        alert('Download te bekijken films: ' + err);
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