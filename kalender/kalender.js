(function(){
  function toYMD(y,m,d) { return y*10000 + m*100 + d; }
  function dateToYMD(d) { return toYMD(d.getFullYear(),d.getMonth()+1,d.getDate()); }
  function div(a,b) { return a/b>>0; }

  var doc = document,
      today = new Date(),
      year = today.getFullYear(),
      todayYMD = dateToYMD(today),
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

  function toDate(ymd) {
    return new Date(div(ymd,10000), div(ymd,100)%100 - 1, ymd%100);
  }

  function addDays(ymd, days) {
    var dt = toDate(ymd);
    dt.setDate(dt.getDate() + days);
    return dateToYMD(dt);
  }

  function easterYMD(y) {
    var c = div(y,100),
        a = (19*(y%19) + c - div(c,4) - div((c - div((c+8),25)+1),3)+15)%30,
        b = (32 + 2*(c%4 + div(y%100,4)) - a - y%4) % 7,
        md = a + b - 7*div((y%19 + 11*a + 22*b),451) + 114;
    return toYMD(y,div(md,31),md%31+1);
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

  function appendDay(p,y,m,mday,wday,yday,elems) {
    var ymd = toYMD(y,m,mday),
        e = append(p, 'div', 'Day', '');
    e.setAttribute('data-ymd', ymd);
    addCls(e, cssDayNames[wday]);
    if(ymd == todayYMD) addCls(e, 'Today');
    append(e, 'span', 'WeekDay', shortDayNames[wday]);
    appendTxt(e, ' ');
    append(e, 'span', 'MonthDay', mday.toString());
    appendTxt(e, ' ');
    append(e, 'span', 'DayMonth', shortMonthNames[m]);
    if(yday) append(e, 'span', 'YearDay', yday.toString());
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
        yday = 1,
        ymd1 = toYMD(year,month,mday),
        ymd = ymd1,
        wday1 = firstWeekDay(year),
        wday = wday1,
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
        disable(appendDay(f, year-1, 12, 32-n+i, i, 0, dayElems));
      }
      appendMonth(f, 1, 31);
    } else {
      appendMonth(f, 1, 31);
      appendWeek(f, wnum);
    }

    while(true) {
      appendDay(f, year, month, mday, wday, yday, dayElems);
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
      yday += 1;
    }

    if(wday > 0) {
      for(var i = wday; i < 7; i++) {
        disable(appendDay(f, year+1, 1, i-wday+1, (i+1)%7, 0, dayElems));
      }
    }

    appendEvent(dayElems[ymd1], 'Nieuwjaar');
    appendEvent(dayElems[toYMD(year,1,6)], 'Driekoningen');
    appendEvent(dayElems[toYMD(year,2,14)], 'Valentijnsdag');
    appendEvent(dayElems[toYMD(year,5,1)], 'Dag van de Arbeid');
    appendEvent(dayElems[toYMD(year,7,11)], 'Feestdag van de Vlaamse Gemeenschap');
    appendEvent(dayElems[toYMD(year,7,21)], 'Nationale feestdag');
    appendEvent(dayElems[toYMD(year,8,15)], 'O.L.V. Hemelvaart');
    appendEvent(dayElems[toYMD(year,9,27)], 'Dag van de Franse Gemeenschap');
    appendEvent(dayElems[toYMD(year,10,31)], 'Halloween');
    appendEvent(dayElems[toYMD(year,11,1)], 'Allerheiligen');
    appendEvent(dayElems[toYMD(year,11,2)], 'Allerzielen');
    appendEvent(dayElems[toYMD(year,11,11)], 'Wapenstilstand');
    appendEvent(dayElems[toYMD(year,11,11)], 'Sint-Maarten');
    appendEvent(dayElems[toYMD(year,11,15)], 'Koningsdag');
    appendEvent(dayElems[toYMD(year,11,15)], 'Dag van de Duitstalige Gemeenschap');
    appendEvent(dayElems[toYMD(year,12,6)], 'Sinterklaas');
    appendEvent(dayElems[toYMD(year,12,25)], 'Kerstmis');
    appendEvent(dayElems[toYMD(year,12,31)], 'Oudejaarsavond');

    appendEvent(dayElems[toYMD(year,3,1)], 'Begin van de meteorologische lente');
    appendEvent(dayElems[toYMD(year,6,1)], 'Begin van de meteorologische zomer');
    appendEvent(dayElems[toYMD(year,9,1)], 'Begin van de meteorologische herfst');
    appendEvent(dayElems[toYMD(year,12,1)], 'Begin van de meteorologische winter');
    
    var easter = easterYMD(year);
    appendEvent(dayElems[easter], 'Pasen');
    appendEvent(dayElems[addDays(easter,1)], 'Paasmaandag');
    appendEvent(dayElems[addDays(easter,39)], 'O.L.H. Hemelvaart');
    appendEvent(dayElems[addDays(easter,49)], 'Pinksteren');
    appendEvent(dayElems[addDays(easter,50)], 'Pinkstermaandag');
    
    appendEvent(dayElems[addDays(ymd1,133-wday1)], 'Moederdag');
    appendEvent(dayElems[addDays(ymd1,161-wday1)], 'Vaderdag');

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
          scrollTo(0,0);
          break;
      }
    });
    render(view);
    setTimeout(scrollToToday,10);
  }

  init(doc.getElementById('yearView'));
}())