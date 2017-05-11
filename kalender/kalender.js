(function(){
  var doc = document,
      today = new Date(),
      year = today.getFullYear(),
      todayYMD = year*10000 + (today.getMonth()+1)*100 + today.getDate(),
      monthNames = ['','januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'],
      shortMonthNames = ['','jan','feb','maa','apr','mei','jun','jul','aug','sep','okt','nov','dec'],
      shortDayNames = ['zo','ma','di','wo','do','vr','za'],
      monthDays = [0,31,28,31,30,31,30,31,31,30,31,30,31],
      monthDaysLeap = [0,31,29,31,30,31,30,31,31,30,31,30,31],
      cssDayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function firstWeekDay(y) {
    var py = y-1;
    return (1 + 5*(py%4) + 4*(py%100) + 6*(py%400)) % 7;
  }

  function firstWeekNum(wday) {
    return wday >= 1 && wday <= 4 ? 1 : 53;
  }

  function isLeapYear(y) {
    return (y%4 === 0 && y%100 !== 0) || y%400 === 0;
  }

  function daysInMonth(m,leap) {
    return (leap?monthDaysLeap:monthDays)[m];
  }

  function div(a,b) { return a/b>>0; }

  function easterYMD(y) {
    var c = div(y,100),
        a = (19*(y%19) + c - div(c,4) - div((c - div((c+8),25)+1),3)+15)%30,
        b = (32 + 2*(c%4 + div(y%100,4)) - a - y%4) % 7,
        md = a + b - 7*div((y%19 + 11*a + 22*b),451) + 114;
    return y*10000 + div(md,31)*100 + md%31+1;
  }

  function addCls(e,cls) {
    e.classList.add(cls);
  }

  function appendTxt(p,txt) {
    p.appendChild(doc.createTextNode(txt));
  }

  function append(p,tag,cls,txt) {
    var e = doc.createElement(tag);
    if(cls.length) addCls(e, cls);
    if(txt.length) appendTxt(e, txt);
    return p.appendChild(e);
  }

  function appendBtn(p,cls,txt,action) {
    append(p, 'button', cls, txt).setAttribute('data-action', action);
  }

  function appendYear(p,y,days) {
    var e = append(p, 'div', 'Year', y + ' ');
    append(e, 'span', 'DayCount', days + ' dagen');
  }

  function appendMonth(p,m,days) {
    var e = append(p, 'div', 'Month', monthNames[m] + ' ');
    append(e, 'span', 'DayCount', days + ' dagen');
  }

  function appendWeek(p,wnum) {
    append(p, 'div', 'Week', 'Week ' + wnum);
  }

  function appendEvent(p,txt) {
    var es = p.getElementsByClassName('DayEvents'),
        e = es.length ? es[0] : append(p, 'ul', 'DayEvents', '');
    append(e, 'li', '', txt);
  }

  function appendDay(p,y,m,mday,wday,elems) {
    var ymd = y*10000 + m*100 + mday,
        e = append(p, 'div', 'Day', '');
    e.setAttribute('data-ymd', ymd);
    addCls(e, cssDayNames[wday]);
    if(ymd == todayYMD) addCls(e, 'Today');
    append(e, 'span', 'WeekDay', shortDayNames[wday]);
    appendTxt(e, ' ');
    append(e, 'span', 'MonthDay', mday.toString());
    appendTxt(e, ' ');
    append(e, 'span', 'DayMonth', shortMonthNames[m]);
    elems[ymd] = e;
    if(wday === 4 && mday === 13) appendEvent(e, 'Vrijdag de dertiende');
    return e;
  }

  function disable(e){
    addCls(e, 'Disabled');
  }

  function render(view) {
    var nodes = view.childNodes;
    for(var i = 0, n = nodes.length; i < n; i++) {
      view.removeChild(view.firstChild);
    }

    var f = doc.createDocumentFragment(),
        month = 1,
        mday = 1,
        ymd = year*10000 + month*100 + mday,
        wday = firstWeekDay(year),
        wnum = firstWeekNum(wday),
        isLeap = isLeapYear(year),
        mdays = daysInMonth(month, isLeap),
        dayElems = { };

    appendYear(f, year, isLeap ? 366 : 365);
    
    if(year > 1900) {
      appendBtn(f, 'NavToPrevYear', 'ga naar ' + (year-1), 'navToPrevYear');
    }

    if(wday != 1) {
      appendWeek(f, wnum);
      for(var i = 1, n = wday > 1 ? wday : 7; i < n; i++) {
        disable(appendDay(f, year-1, 12, 32-n+i, i, dayElems));
      }
      appendMonth(f, 1, 31);
    } else {
      appendMonth(f, 1, 31);
      appendWeek(f, wnum);
    }

    while(true) {
      appendDay(f, year, month, mday, wday, dayElems);
      if(mday < mdays) {
        mday += 1;
      } else {
        mday = 1;
        month += 1;
        if(month < 13) {
          mdays = daysInMonth(month, isLeap);
          appendMonth(f, month, mdays);
        } else {
          break;
        }
      }

      wday = (wday+1)%7;
      if(wday == 1) {
        wnum = (wnum%53)+1;
        if(wnum == 53 && mday >= 29) {
          wnum = 1;
        }
        appendWeek(f, wnum); 
      }
    }

    if(wday > 0) {
      for(var i = wday; i < 7; i++) {
        disable(appendDay(f, year+1, 1, i-wday+1, (i+1)%7, dayElems));
      }
    }

    appendEvent(dayElems[year*10000+ 101], 'Nieuwjaar');
    appendEvent(dayElems[year*10000+ 106], 'Driekoningen');
    appendEvent(dayElems[year*10000+ 214], 'Valentijnsdag');
    appendEvent(dayElems[year*10000+ 501], 'Dag van de Arbeid');
    appendEvent(dayElems[year*10000+ 711], 'Feestdag van de Vlaamse Gemeenschap');
    appendEvent(dayElems[year*10000+ 721], 'Nationale feestdag');
    appendEvent(dayElems[year*10000+ 815], 'O.L.V. Hemelvaart');
    appendEvent(dayElems[year*10000+ 927], 'Dag van de Franse Gemeenschap');
    appendEvent(dayElems[year*10000+1031], 'Halloween');
    appendEvent(dayElems[year*10000+1101], 'Allerheiligen');
    appendEvent(dayElems[year*10000+1102], 'Allerzielen');
    appendEvent(dayElems[year*10000+1111], 'Wapenstilstand');
    appendEvent(dayElems[year*10000+1111], 'Sint-Maarten');
    appendEvent(dayElems[year*10000+1115], 'Koningsdag');
    appendEvent(dayElems[year*10000+1115], 'Dag van de Duitstalige Gemeenschap');
    appendEvent(dayElems[year*10000+1206], 'Sinterklaas');
    appendEvent(dayElems[year*10000+1225], 'Kerstmis');
    appendEvent(dayElems[year*10000+1231], 'Oudejaarsavond');

    appendEvent(dayElems[year*10000+ 301], 'Begin van de meteorologische lente');
    appendEvent(dayElems[year*10000+ 601], 'Begin van de meteorologische zomer');
    appendEvent(dayElems[year*10000+ 901], 'Begin van de meteorologische herfst');
    appendEvent(dayElems[year*10000+1201], 'Begin van de meteorologische winter');
    
    appendEvent(dayElems[easterYMD(year)], 'Pasen');

    if(year < 9999) {
      appendBtn(f, 'NavToNextYear', 'ga naar ' + (year+1), 'navToNextYear');
    }

    view.appendChild(f);
  }

  function scrollToToday() {
    var es = doc.getElementsByClassName('Today');
    if(es.length) {
      var e = es[0];
      e.scrollIntoView();
      scrollBy(0, -e.scrollHeight * 5);
    }
  }

  function init(view) {
    view.addEventListener('click', function(e) {
      switch(e.target.getAttribute('data-action')) {
        case 'navToPrevYear':
          year -= 1;
          render(view);
          scrollTo(0, doc.body.scrollHeight);
          break;
        case 'navToNextYear':
          year += 1;
          render(view);
          scrollTo(0, 0);
          break;
      }
    });
    render(view);
    setTimeout(scrollToToday, 10);
  }

  init(doc.getElementById('yearView'));
}())