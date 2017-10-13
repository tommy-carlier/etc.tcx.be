(function(){
  "use strict";

  var w = window, d = document;
  
  if(!(w.localStorage && w.JSON && w.XMLHttpRequest)) {
    return;
  }

  function loadJson(name) {
    var s = localStorage[name];
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
    if(cls.length) e.classList.add(cls);
    if(txt.length) e.appendChild(d.createTextNode(txt));
    return p.appendChild(e);
  }

  function renderBoek(lijst, boek) {
    append(lijst, 'DT', 'Title', boek.title);
    var dd = append(lijst, 'DD');
    append(dd, 'SPAN', 'Author', boek.auteur);
    append(dd, 'SPAN', 'Location', boek.vindplaats);
  }

  function render(data) {
    if('boeken' in data) {
      var boeken = data.boeken,
          f = d.createDocumentFragment();

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

  var apiKey = localStorage['airtableApiKey'];

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
        auteur: ''
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
  
  function startDownloadData() {
    request('Auteurs?fields%5B%5D=Name', function(json, err) {
      if(err) {
        alert(err);
        return;
      }

      var auteurs = extractAuteurs(json.records);
      request('Boeken?view=Te%20lezen%20in%20bib&fields%5B%5D=Titel&fields%5B%5D=Auteur&fields%5B%5D=Vindplaats%20bib', function(json, err) {
        if(err) {
          alert(err);
          return;
        }

        var boeken = extractBoeken(json.records, auteurs);
        var data = { boeken:boeken };
        saveJson('data', data)
        render(data);
      });
    });
  }
  
  if(apiKey) {
    location.hash = 'listScreen';
    render(loadJson('data'));
    startDownloadData();
  } else {
    location.hash = 'apiKeyScreen';
  }
}())