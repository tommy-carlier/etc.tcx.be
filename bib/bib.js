(function(){
  "use strict";

  var w = window, d = document;
  
  if(!(w.localStorage && w.JSON && w.fetch)) {
    return;
  }

  if(w.applicationCache) {
    applicationCache.addEventListener('updateready', ev => applicationCache.swapCache());
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
    return txt.join(' – ');
  }

  function renderBoek(lijst, boek) {
    append(lijst, 'DT', 'Title', boek.titel);
    var dd = append(lijst, 'DD', 'Details');
    appendTxt(dd, getBoekDetails(boek));
    if(boek.inReeks) append(dd, 'SPAN', 'Series', '(reeks)');
    if(boek.genres) {
      dd = append(lijst, 'DD', 'Details');
      appendTxt(dd, boek.genres.join(', '));
    }
  }

  function formatDuration(seconds) {
    var hours = Math.floor(seconds / (60 * 60));
    var minutes = Math.round((seconds - hours * 60 * 60) / 60);
    return hours.toString() + ':' + (minutes < 10 ? '0' + minutes : minutes);
  }

  function getFilmDetails(film) {
    var txt = [];
    if(film.jaarUitgegeven > 0) txt.push(film.jaarUitgegeven);
    if(film.duur) txt.push(formatDuration(film.duur));
    return txt.join(' – ');
  }

  function renderFilm(lijst, film) {
    append(lijst, 'DT', 'Title', film.titel);
    var dd = append(lijst, 'DD', 'Details');
    appendTxt(dd, getFilmDetails(film));
  }

  function renderItems(list, items, render) {
    var f = d.createDocumentFragment();
    
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

  function renderFilms(films) {
    shuffle(films);
    renderItems(lijstTeBekijkenFilms, films, renderFilm);
  }

  var apiKey = loadOrMigrate('bib/apiKey', 'airtableApiKey');

  function request(url, cb) {
    fetch('https://api.airtable.com/v0/' + url, {
      headers: { Authorization: 'Bearer ' + apiKey }
    }).then(response => response.ok ? response : Promise.reject(Error(req.statusText)))
    .then(response => response.json())
    .then(json => cb(json, ''))
    .catch(err => cb({}, err));
  }

  function requestRecords(url, cb) {
    var records = [];
    function reqNextPage(offset) {
      var urlWithOffset = url;
      if(offset.length) urlWithOffset += '&offset=' + offset;
      request(urlWithOffset, (json, err) => {
        if(err) {
          cb(records, err);
          return;
        }

        records = records.concat(json.records);
        if('offset' in json) {
          reqNextPage(json.offset);
        } else {
          cb(records);
        }
      });
    }
    reqNextPage('');
  }

  function requestTeLezenBoeken(url, cb) {
    requestRecords('appS3vbT8bkcbfnbt/' + url, cb);
  }

  function requestTeBekijkenFilms(url, cb) {
    requestRecords('app2cUKpOgqnvXJn2/' + url, cb);
  }

  function extractNames(items, records) {
    for(var n = records.length, i = 0; i < n; i++) {
      var record = records[i];
      items[record.id] = record.fields.Name;
    }
  }

  function extractBoeken(records, auteurs, genres) {
    var boeken = [];
    for(var bn = records.length, bi = 0; bi < bn; bi++) {
      var fields = records[bi].fields;
      var boek = {
        titel: fields.Titel,
        vindplaats: fields['Vindplaats bib'],
        auteur: '',
        inReeks: 'Reeks' in fields && fields.Reeks.length > 0,
        paginas: fields["Pagina's"]||0,
        genres: []
      };
      if(fields.Auteur.length) {
        var auteurID = fields.Auteur[0];
        if(auteurID in auteurs) {
          boek.auteur = auteurs[auteurID];
        }
      }
      var boekGenres = fields.Genres||[];
      for(var gn = boekGenres.length, gi = 0; gi < gn; gi++) {
        var genreID = boekGenres[gi];
        if(genreID in genres) {
          boek.genres.push(genres[genreID]);
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
        jaarUitgegeven: fields['Jaar uitgegeven']||0,
        duur: fields.Duur
      });
    }
    return films;
  }

  function downloadBoekenNames(url, items, cb) {
    requestTeLezenBoeken(url, (records, err) => {
      if(err) {
        cb(err);
        return;
      }

      extractNames(items, records);
      items.geladen = true;
      cb();
    });
  }

  function downloadAuteurs(auteurs, cb) {
    downloadBoekenNames('Auteurs?view=Te%20lezen%20in%20bib&fields%5B%5D=Name', auteurs, cb);
  }

  function downloadGenres(genres, cb) {
    downloadBoekenNames('Genres?view=Te%20lezen%20in%20bib&fields%5B%5D=Name', genres, cb);
  }

  function joinData(boekRecs, auteurs, genres) {
    if(boekRecs.length && auteurs.geladen && genres.geladen) {
      var boeken = extractBoeken(boekRecs, auteurs, genres);
      saveJson('bib/boeken', boeken);
      renderBoeken(boeken);
    }
  }
  
  function startDownloadData() {
    var auteurs = { geladen:false }, genres = { geladen:false }, boekRecs = [];
    
    downloadAuteurs(auteurs, err => {
      if(err) {
        alert('Download auteurs: ' + err);
        return;
      }
      joinData(boekRecs, auteurs, genres);
    });
    
    downloadGenres(genres, err => {
      if(err) {
        alert('Download genres: ' + err);
        return;
      }
      joinData(boekRecs, auteurs, genres);
    });

    requestTeLezenBoeken('Boeken?view=Te%20lezen%20in%20bib&fields%5B%5D=Titel&fields%5B%5D=Auteur&fields%5B%5D=Vindplaats%20bib&fields%5B%5D=Reeks&fields%5B%5D=Pagina%27s&fields%5B%5D=Genres', (records, err) => {
      if(err) {
        alert('Download te lezen boeken: ' + err);
        return;
      }

      boekRecs = records;
      joinData(boekRecs, auteurs, genres);
    });

    requestTeBekijkenFilms('Films?view=Te%20bekijken%20in%20bib&fields%5B%5D=Titel&fields%5B%5D=Jaar%20uitgegeven&fields%5B%5D=Duur', (records, err) => {
      if(err) {
        alert('Download te bekijken films: ' + err);
        return;
      }

      var films = extractFilms(records);
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
  
  if(apiKey && (location.hash != 'apiKeyScreen')) {
    navigateToListScreen();
  } else {
    location.hash = 'apiKeyScreen';
    d.getElementById('apiKeyScreen').addEventListener('submit', e => {
      e.preventDefault();
      apiKey = d.getElementById('apiKeyInput').value;
      if(apiKey) {
        localStorage.setItem('bib/apiKey', apiKey);
        navigateToListScreen();
      }
    });
  }
}())