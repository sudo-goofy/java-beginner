/* ============================================================================
   Cheat Sheet: Java — gemeinsame Engine.
   Ohne Server, ohne Build, ohne Abhängigkeiten.

   Drei Regeln, die vorher verletzt waren und jetzt überall gelten:

   1  OHNE JAVASCRIPT MUSS ALLES LESBAR SEIN. Die Seite blendet nichts ein,
      was ohne Skript unsichtbar bliebe. Erst wenn dieses Skript läuft, setzt
      es <html class="js"> — und erst dann darf etwas animiert werden.
   2  JEDE ÄNDERUNG, DIE MAN SIEHT, MUSS MAN AUCH HÖREN KÖNNEN. Jede Ausgabe,
      die sich zur Laufzeit ändert, steckt in einer aria-live-Region.
   3  EIN FEHLENDES ELEMENT DARF NIE EINE GANZE SEITE LAHMLEGEN. Jedes Modul
      läuft in seinem eigenen try/catch.
   ========================================================================== */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Die Seite gibt es auf Deutsch und auf Englisch (web/en/, erzeugt von
     tools/web_en.py). Texte, die dieses Skript selbst erzeugt, stehen hier in
     beiden Sprachen: T(deutsch, englisch). Die Sprache kommt aus <html lang>. */
  var EN = document.documentElement.lang === 'en';
  function T(de, en) { return EN ? en : de; }

  /** Jedes Modul gekapselt: ein Absturz bleibt lokal. */
  function modul(name, fn) {
    try { fn(); }
    catch (e) { if (window.console) console.warn('[Cheat Sheet: Java] Modul "' + name + '" übersprungen:', e); }
  }

  var sanft = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function icon(name, klasse) {
    return '<svg class="i ' + (klasse || '') + '" aria-hidden="true" focusable="false">' +
           '<use href="#i-' + name + '"></use></svg>';
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* Früher speicherte die Seite hier Kapitel-Häkchen und Quiz-Ergebnisse. Das
     gibt es nicht mehr; was davon noch im Browser liegt, wird aufgeräumt. */
  try { localStorage.removeItem('codecafe-java'); } catch (e) { /* egal */ }

  /* --------------------------------------------- Entwicklungsumgebung */
  /* Zwei IDEs, eine Wahl. Sie gilt für jede Tafel auf der Seite und überlebt
     den Seitenwechsel — wer sich einmal entschieden hat, soll das nicht auf
     jeder Seite wiederholen.

     Ohne dieses Modul steht im HTML beides untereinander, jede Fassung mit
     ihrem Namen darüber. Das ist der Zustand ohne JavaScript, und er ist nicht
     kaputt, nur länger. Erst hier entstehen die Reiter — ein Knopf, der nichts
     tut, wäre schlimmer als eine lange Seite. */

  modul('ide', function () {
    var tafeln = $$('[data-ide-tafel]');
    if (!tafeln.length) return;

    var GESPEICHERT = 'codecafe-ide';   // Adresse im Browserspeicher, nicht umbenennen
    var lauf = 0;
    var gruppen = [];

    tafeln.forEach(function (tafel) {
      var blaetter = $$('.ide-blatt', tafel);
      if (blaetter.length < 2) return;

      var leiste = document.createElement('div');
      leiste.className = 'ide-wahl';
      leiste.setAttribute('role', 'tablist');
      leiste.setAttribute('aria-label', T('Entwicklungsumgebung wählen', 'Choose development environment'));

      var knoepfe = blaetter.map(function (blatt) {
        var nr = ++lauf;
        var schild = $('.ide-name', blatt);
        var name = schild ? schild.textContent.trim() : blatt.getAttribute('data-ide');

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'ide-reiter-' + nr;
        btn.setAttribute('role', 'tab');
        btn.setAttribute('data-ide-wahl', blatt.getAttribute('data-ide'));
        btn.innerHTML = icon('ide') + '<span>' + esc(name) + '</span>';

        blatt.id = 'ide-blatt-' + nr;
        blatt.setAttribute('role', 'tabpanel');
        blatt.setAttribute('aria-labelledby', btn.id);
        btn.setAttribute('aria-controls', blatt.id);
        if (schild) schild.parentNode.removeChild(schild);

        leiste.appendChild(btn);
        return btn;
      });

      tafel.insertBefore(leiste, tafel.firstChild);
      gruppen.push({ knoepfe: knoepfe, blaetter: blaetter });
    });

    if (!gruppen.length) return;

    function anwenden(key) {
      gruppen.forEach(function (g) {
        var treffer = -1;
        g.knoepfe.forEach(function (btn, i) {
          if (btn.getAttribute('data-ide-wahl') === key) treffer = i;
        });
        if (treffer < 0) treffer = 0;   // unbekannter Schlüssel: die erste nehmen
        g.knoepfe.forEach(function (btn, i) {
          btn.setAttribute('aria-selected', i === treffer ? 'true' : 'false');
          btn.tabIndex = i === treffer ? 0 : -1;
          g.blaetter[i].hidden = i !== treffer;
        });
      });
    }

    gruppen.forEach(function (g) {
      g.knoepfe.forEach(function (btn, i) {
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-ide-wahl');
          try { localStorage.setItem(GESPEICHERT, key); } catch (e) { /* dann eben nur diese Seite */ }
          anwenden(key);
        });
        btn.addEventListener('keydown', function (e) {
          var schritt = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (!schritt) return;
          e.preventDefault();
          var ziel = g.knoepfe[(i + schritt + g.knoepfe.length) % g.knoepfe.length];
          ziel.focus();
          ziel.click();
        });
      });
    });

    var gewaehlt = '';
    try { gewaehlt = localStorage.getItem(GESPEICHERT) || ''; } catch (e) { /* egal */ }
    anwenden(gewaehlt || gruppen[0].knoepfe[0].getAttribute('data-ide-wahl'));
  });

  /* ------------------------------------------------------- Lesefortschritt */
  /* Die Antwort auf „3.615 Wörter ohne Orientierung“: Man sieht jederzeit,
     wie viel noch kommt. */

  modul('lesefortschritt', function () {
    var balken = $('#lesebalken');
    if (!balken) return;
    var ziel = $('main') || document.body;
    var laufend = false;
    function rechne() {
      laufend = false;
      var oben = ziel.offsetTop;
      var hoehe = ziel.offsetHeight - window.innerHeight;
      var p = hoehe <= 0 ? 1 : (window.scrollY - oben) / hoehe;
      balken.style.width = Math.max(0, Math.min(1, p)) * 100 + '%';
    }
    window.addEventListener('scroll', function () {
      if (!laufend) { laufend = true; requestAnimationFrame(rechne); }
    }, { passive: true });
    window.addEventListener('resize', rechne);
    rechne();
  });

  /* --------------------------------------------- Kapitel-Inhaltsverzeichnis */
  /* Wird aus den <h2> des Kapitels gebaut — kein Pflegeaufwand in den
     Kapiteldateien, und es kann nicht veralten. */

  modul('kapitel-inhalt', function () {
    var box = $('#kapitel-inhalt');
    if (!box) return;
    var haupt = $('main');
    if (!haupt) return;

    var ueber = $$('h2[id]', haupt).filter(function (h) { return !box.contains(h); });
    if (ueber.length < 2) { box.hidden = true; return; }

    var ol = document.createElement('ol');
    ueber.forEach(function (h) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + h.id;
      /* Die Themennummer abgesetzt, der Titel daneben. */
      var nr = $('.nr', h);
      if (nr) {
        var n = document.createElement('span');
        n.className = 'ki-nr';
        n.textContent = nr.textContent.trim();
        a.appendChild(n);
        a.appendChild(document.createTextNode(' ' + h.textContent.replace(nr.textContent, '').trim()));
      } else {
        a.textContent = h.textContent.trim();
      }
      li.appendChild(a);
      ol.appendChild(li);
    });
    box.appendChild(ol);

    /* Markiert ist der Abschnitt, in dem man gerade liest: die letzte
       Überschrift, die schon unter der Kopfzeile verschwunden ist oder knapp
       darunter steht. Vorher galt die Markierung nur, solange die Überschrift
       selbst zu sehen war, mitten im Abschnitt war dann nichts markiert. */
    var links = $$('a', ol);
    var geplant = false;
    function markiere() {
      geplant = false;
      var grenze = window.innerHeight * 0.3, aktiv = null;
      ueber.forEach(function (h) { if (h.getBoundingClientRect().top <= grenze) aktiv = h.id; });
      links.forEach(function (a) {
        if (a.getAttribute('href') === '#' + aktiv) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
    window.addEventListener('scroll', function () {
      if (!geplant) { geplant = true; window.setTimeout(markiere, 60); }
    }, { passive: true });
    markiere();
  });

  /* --------------------------------------------------- Syntaxhervorhebung */

  var SCHLUESSEL = ('public private protected class interface static void return if else while do for ' +
    'switch case break continue default final abstract extends implements super this new enum import ' +
    'package true false null throws try catch').split(' ');
  var TYPEN = 'int double boolean char String float long short byte var'.split(' ');

  function faerbe(quelle) {
    var re = /(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*")|('(?:[^'\\\n]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/g;
    var out = '', last = 0, m;
    while ((m = re.exec(quelle))) {
      out += esc(quelle.slice(last, m.index));
      if (m[1] || m[2]) out += '<span class="tok-com">' + esc(m[1] || m[2]) + '</span>';
      else if (m[3] || m[4]) out += '<span class="tok-str">' + esc(m[3] || m[4]) + '</span>';
      else if (m[5]) out += '<span class="tok-num">' + esc(m[5]) + '</span>';
      else {
        var w = m[6];
        if (SCHLUESSEL.indexOf(w) >= 0) out += '<span class="tok-kw">' + w + '</span>';
        else if (TYPEN.indexOf(w) >= 0) out += '<span class="tok-type">' + w + '</span>';
        else if (/^[A-Z]/.test(w)) out += '<span class="tok-cls">' + w + '</span>';
        else out += w;
      }
      last = re.lastIndex;
    }
    return out + esc(quelle.slice(last));
  }

  modul('syntax', function () {
    /* code.klick bleibt ungefärbt: Seine anklickbaren Teile sind schon Markup. */
    $$('pre code.java:not(.klick)').forEach(function (c) { c.innerHTML = faerbe(c.textContent); });
  });

  /* ------------------------------------------------------------ Aufbau */
  /* Die Schablone erklärt sich selbst: Jeder Teil mit data-teil ist ein
     Knopf, seine Erklärung steht verborgen im selben Kasten (data-erkl) und
     erscheint im Hinweisfeld darunter. Ohne Klick steht dort der Hinweis. */

  modul('aufbau', function () {
    $$('.aufbau, .klickcode').forEach(function (box) {
      var teile = $$('[data-teil]', box), info = $('.aufbau-info', box);
      if (!teile.length || !info) return;
      var start = info.innerHTML;
      info.setAttribute('aria-live', 'polite');

      function zeige(t) {
        var key = t.getAttribute('data-teil');
        var an = t.getAttribute('aria-pressed') !== 'true';
        teile.forEach(function (x) {
          x.setAttribute('aria-pressed', String(an && x.getAttribute('data-teil') === key));
        });
        var erkl = $('[data-erkl="' + key + '"]', box);
        info.innerHTML = an && erkl ? erkl.innerHTML : start;
        /* Gültigkeitsbereich: data-gilt="von-bis" nennt die Zeilen (.zl), in
           denen die Variable gilt. Sie bleiben hell, der Rest tritt zurück. */
        var zeilen = $$('.zl', box), bereich = an && erkl && erkl.getAttribute('data-gilt');
        var grenzen = bereich ? bereich.split('-').map(Number) : [0, -1];
        zeilen.forEach(function (z, i) {
          var drin = i + 1 >= grenzen[0] && i + 1 <= grenzen[1];
          z.classList.toggle('gilt', !!bereich && drin);
          z.classList.toggle('aus', !!bereich && !drin);
        });
        info.classList.remove('frisch');
        void info.offsetWidth;          /* Animation neu starten */
        info.classList.add('frisch');
      }

      teile.forEach(function (t) {
        t.setAttribute('role', 'button');
        t.setAttribute('tabindex', '0');
        t.setAttribute('aria-pressed', 'false');
        t.addEventListener('click', function () { zeige(t); });
        t.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zeige(t); }
        });
      });
    });
  });

  /* ------------------------------------------------------------ Sprachwahl */
  /* Das Menü (details.sprache) funktioniert ohne Skript. Hier kommt dazu: Es
     schließt beim Klick daneben und mit Esc, und der Sprung in die andere
     Sprache bleibt an derselben Stelle der Seite (#Anker). */

  modul('sprache', function () {
    var menue = $('.sprache');
    if (!menue) return;
    document.addEventListener('click', function (e) {
      if (menue.open && !menue.contains(e.target)) menue.open = false;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menue.open) { menue.open = false; $('summary', menue).focus(); }
    });
    $$('a', menue).forEach(function (a) {
      a.addEventListener('click', function () {
        if (location.hash) a.href = a.getAttribute('href').split('#')[0] + location.hash;
      });
    });
  });

  /* ---------------------------------------------------------- Optionales */
  /* Jede optionale Karte (details.optional) öffnet ihren Inhalt in einem
     gemeinsamen Fenster. Der Inhalt wird verschoben, nicht kopiert: Runner,
     Lücken und Lösungen darin behalten ihre Funktion. Beim Schließen wandert
     er zurück. Ohne Skript bleibt es ein normales <details>. */

  modul('optional', function () {
    var karten = $$('details.optional');
    if (!karten.length || typeof HTMLDialogElement !== 'function') return;

    var main = $('main') || document.body;
    var fenster = document.createElement('dialog');
    fenster.className = 'opt-fenster';
    fenster.setAttribute('aria-labelledby', 'opt-titel');
    fenster.innerHTML =
      '<div class="opt-fenster-kopf">' + icon('extra') +
        '<h2 id="opt-titel"></h2><span class="opt-marke">optional</span>' +
        '<button class="opt-zu" type="button" aria-label="' + T('Schließen', 'Close') + '">' + icon('falsch') + '</button>' +
      '</div><div class="opt-fenster-inhalt"></div>';
    main.appendChild(fenster);   /* in main, damit die Regeln für Tabellen greifen */

    var titel = $('#opt-titel', fenster), koerper = $('.opt-fenster-inhalt', fenster);
    var offen = null;

    function oeffne(karte, ziel) {
      if (offen !== karte) {
        if (offen) fenster.close();
        var inhalt = $(':scope > .inhalt', karte);
        if (!inhalt) return;
        titel.textContent = $('.opt-titel', karte).textContent;
        koerper.appendChild(inhalt);
        offen = karte;
        fenster.showModal();
        koerper.scrollTop = 0;
      }
      if (ziel && koerper.contains(ziel)) ziel.scrollIntoView({ block: 'start' });
    }

    fenster.addEventListener('close', function () {
      if (!offen) return;
      var inhalt = $(':scope > .inhalt', koerper);
      if (inhalt) offen.appendChild(inhalt);
      $('summary', offen).focus();
      offen = null;
    });
    $('.opt-zu', fenster).addEventListener('click', function () { fenster.close(); });
    /* Klick auf den abgedunkelten Rand schließt. */
    fenster.addEventListener('click', function (e) { if (e.target === fenster) fenster.close(); });

    karten.forEach(function (karte) {
      karte.open = false;
      $('summary', karte).addEventListener('click', function (e) {
        e.preventDefault();
        oeffne(karte);
      });
    });

    /* Verweise wie #arraylist führen auf eine Karte oder in sie hinein. Zeigt
       ein Verweis im Fenster auf die Seite dahinter, geht das Fenster zu. */
    function zumAnker() {
      var id = decodeURIComponent(location.hash.slice(1));
      var ziel = id && document.getElementById(id);
      if (!ziel) return;
      var karte = ziel.closest('details.optional') ||
                  (offen && koerper.contains(ziel) ? offen : null);
      if (karte) { oeffne(karte, ziel === karte ? null : ziel); return; }
      if (offen) { fenster.close(); ziel.scrollIntoView({ block: 'start' }); }
    }
    window.addEventListener('hashchange', zumAnker);
    /* Derselbe Anker ein zweites Mal löst kein hashchange aus. */
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (a && a.getAttribute('href') === location.hash) setTimeout(zumAnker, 0);
    });
    zumAnker();
  });

  /* -------------------------------------------------------------- Runner */
  /* „Ausführen“ tippt die hinterlegte Ausgabe. Im Trace-Modus muss man sie
     erst selbst vorhersagen. Die Konsole ist eine aria-live-Region: Wer nicht
     zusieht, bekommt die Ausgabe trotzdem mit. */

  modul('runner', function () {
    $$('.runner').forEach(function (r) {
      var btn = $('.run-btn', r), out = $('.konsole', r);
      if (!btn || !out) return;

      out.setAttribute('role', 'status');
      out.setAttribute('aria-live', 'polite');

      var text = (r.getAttribute('data-out') || '').replace(/\\n/g, '\n');
      /* Manche Beispiele SOLLEN abstürzen — Kapitel 11 handelt von nichts
         anderem. Die Meldung kommt von der JVM und nicht vom Programm, also
         steht sie nicht in data-out, sondern in data-crash, und sie wird
         abgesetzt dargestellt statt mitgetippt. */
      var absturz = (r.getAttribute('data-crash') ||
                     r.getAttribute('data-fehler') || '').replace(/\\n/g, '\n');
      var laeuft = false;

      function fertig() {
        if (absturz) {
          var s = document.createElement('span');
          s.className = 'absturz';
          /* Der Tippdurchlauf schließt mit einem Zeilenumbruch ab, die sanfte
             Fassung nicht — sonst stünde hier mal eine Leerzeile, mal keine. */
          var voran = out.textContent;
          s.textContent = (!voran || voran.slice(-1) === '\n' ? '' : '\n') + absturz;
          out.appendChild(s);
        }
        laeuft = false;
        btn.disabled = false;
      }

      function ausgeben() {
        if (laeuft) return;
        laeuft = true;
        btn.disabled = true;
        if (sanft || !text) {   /* ohne Ausgabe nichts tippen, sonst stünde eine Leerzeile da */
          out.textContent = text;
          fertig();
          return;
        }
        out.textContent = '';
        var zeilen = text.split('\n'), zi = 0, ci = 0;
        (function tick() {
          if (zi >= zeilen.length) { fertig(); return; }
          var zeile = zeilen[zi];
          if (ci < zeile.length) { out.textContent += zeile.charAt(ci++); setTimeout(tick, 14); }
          else { out.textContent += '\n'; zi++; ci = 0; setTimeout(tick, 110); }
        })();
      }
      btn.addEventListener('click', ausgeben);

      if (!r.hasAttribute('data-trace')) return;

      /* Trace: erst tippen, dann vergleichen. */
      btn.disabled = true;
      var id = 'trace-' + Math.random().toString(36).slice(2, 8);
      var ui = document.createElement('div');
      ui.className = 'run-leiste';
      ui.style.flexDirection = 'column';
      ui.style.alignItems = 'stretch';
      ui.innerHTML =
        '<label class="run-hinweis" for="' + id + '">' + T(
          'Erst du, dann Java: Was gibt dieser Code aus? Tipp die Ausgabe Zeile für Zeile ein.',
          'You first, then Java: What does this code print? Type the output line by line.') + '</label>' +
        '<textarea id="' + id + '" class="cz" rows="3" spellcheck="false" ' +
        'style="width:100%;text-align:left;border-style:solid"></textarea>' +
        '<p style="margin:0"><button class="btn btn-klein trace-check" type="button">' +
        T('Vergleichen und ausführen', 'Compare and run') + '</button></p>' +
        '<p class="run-hinweis trace-meldung" role="status" aria-live="polite"></p>';
      r.insertBefore(ui, $('.run-leiste', r));

      function norm(s) {
        return s.replace(/\r/g, '').trim().split('\n')
          .map(function (l) { return l.trim(); }).join('\n');
      }
      $('.trace-check', ui).addEventListener('click', function () {
        var eingabe = norm($('#' + id, ui).value);
        var soll = norm(text);
        var m = $('.trace-meldung', ui);
        if (eingabe === '') {
          m.textContent = T('Erst tippen, dann vergleichen. Sonst wäre es Raten.', 'Type first, then compare. Otherwise it is just guessing.');
          return;
        }
        btn.disabled = false;
        if (eingabe === soll) {
          m.textContent = T('Exakt richtig vorhergesagt. Java bestätigt:', 'Predicted exactly right. Java confirms:');
        } else {
          var a = eingabe.split('\n'), b = soll.split('\n'), i = 0;
          while (i < Math.max(a.length, b.length) && a[i] === b[i]) i++;
          m.textContent = T('Fast: Ab Zeile ' + (i + 1) + ' weicht deine Vorhersage ab. ' +
            'Sieh der echten Ausgabe zu und finde heraus, warum.',
            'Close: from line ' + (i + 1) + ' your prediction differs. ' +
            'Watch the real output and find out why.');
        }
        ausgeben();
      });
    });
  });

  /* ---------------------------------------------------- Vorhersage-Sperre */
  /* Vorher stand der Grund für die Sperre nur im title-Attribut — auf dem
     Handy also nirgends, für Screenreader ebenfalls nicht. Jetzt steht er
     sichtbar im Dokument und verschwindet, sobald man sich festgelegt hat. */

  modul('vorhersage', function () {
    $$('.predict').forEach(function (pr) {
      var ziele = [];
      (pr.getAttribute('data-target') || '').split(',').forEach(function (sel) {
        sel = sel.trim();
        if (sel) $$(sel).forEach(function (t) { ziele.push(t); });
      });
      if (!ziele.length) return;

      var hinweisId = 'sperre-' + Math.random().toString(36).slice(2, 8);
      var hinweis = document.createElement('p');
      hinweis.className = 'gesperrt-hinweis';
      hinweis.id = hinweisId;
      hinweis.innerHTML = icon('denk') +
        '<span>' + T('Noch gesperrt: Leg erst oben fest, was du erwartest.', 'Locked for now: first decide above what you expect.') + '</span>';
      pr.appendChild(hinweis);

      ziele.forEach(function (t) {
        t.disabled = true;
        t.setAttribute('aria-describedby', hinweisId);
      });

      $$('.predict-opts button', pr).forEach(function (b) {
        b.addEventListener('click', function () {
          if (pr.classList.contains('fest')) return;
          pr.classList.add('fest');
          b.classList.add('gewaehlt');
          b.setAttribute('aria-pressed', 'true');
          $$('.predict-opts button', pr).forEach(function (o) { o.disabled = true; });
          ziele.forEach(function (t) {
            t.disabled = false;
            t.removeAttribute('aria-describedby');
          });
          hinweis.remove();
          var notiz = $('.predict-notiz', pr);
          if (notiz) notiz.hidden = false;
        });
      });
    });
  });

  /* ------------------------------------------------------ Parsons-Puzzle */

  modul('parsons', function () {
    $$('.parsons').forEach(function (p) {
      var box = $('.parsons-zeilen', p);
      var pruefen = $('.parsons-check', p);
      var meldung = $('.parsons-meldung', p);
      if (!box || !pruefen) return;

      if (meldung) { meldung.setAttribute('role', 'status'); meldung.setAttribute('aria-live', 'polite'); }

      var zeilen = $$('.p-zeile', box);
      var norm = function (s) { return s.replace(/\s+/g, ' ').trim(); };
      var soll = zeilen.map(function (l) { return norm(l.textContent); });

      zeilen.forEach(function (l) {
        var txt = document.createElement('span');
        txt.className = 'p-text';
        txt.textContent = l.textContent;
        l.textContent = '';
        l.appendChild(txt);

        var ctr = document.createElement('span');
        ctr.className = 'p-knoepfe';
        ['hoch', 'runter'].forEach(function (richtung) {
          var b = document.createElement('button');
          b.type = 'button';
          b.innerHTML = icon(richtung === 'hoch' ? 'pfeil-runter' : 'pfeil-runter');
          if (richtung === 'hoch') b.firstChild.style.transform = 'rotate(180deg)';
          b.setAttribute('aria-label', T(
            'Zeile „' + norm(txt.textContent) + '“ nach ' + (richtung === 'hoch' ? 'oben' : 'unten') + ' verschieben',
            'Move line “' + norm(txt.textContent) + '” ' + (richtung === 'hoch' ? 'up' : 'down')));
          b.addEventListener('click', function () {
            var nachbar = richtung === 'hoch' ? l.previousElementSibling : l.nextElementSibling;
            if (!nachbar) return;
            if (richtung === 'hoch') box.insertBefore(l, nachbar);
            else box.insertBefore(nachbar, l);
            marken_weg();
            b.focus();
          });
          ctr.appendChild(b);
        });
        l.appendChild(ctr);
      });

      function marken_weg() {
        $$('.p-zeile', box).forEach(function (l) { l.classList.remove('p-ok', 'p-bad'); });
      }
      function jetzt() {
        return $$('.p-zeile', box).map(function (l) { return norm($('.p-text', l).textContent); });
      }

      /* Mischen — aber nie in die Lösung hinein. */
      var schutz = 0;
      do {
        var els = $$('.p-zeile', box);
        for (var i = els.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = els[i]; els[i] = els[j]; els[j] = tmp;
        }
        els.forEach(function (e) { box.appendChild(e); });
        schutz++;
      } while (schutz < 20 && jetzt().join('\n') === soll.join('\n'));

      pruefen.addEventListener('click', function () {
        var ist = jetzt(), allesOk = true, falsche = 0;
        $$('.p-zeile', box).forEach(function (l, i) {
          var ok = ist[i] === soll[i];
          l.classList.toggle('p-ok', ok);
          l.classList.toggle('p-bad', !ok);
          if (!ok) { allesOk = false; falsche++; }
        });
        if (!meldung) return;
        if (allesOk) {
          meldung.textContent = T('Kompiliert. Jede Zeile sitzt am richtigen Platz.', 'Compiles. Every line is in the right place.');
          p.classList.add('geloest');
          $$('.p-knoepfe', p).forEach(function (c) { c.remove(); });
          pruefen.disabled = true;
        } else {
          meldung.textContent = T(falsche + ' von ' + ist.length + ' Zeilen sitzen noch falsch ' +
            '(rot umrandet). Tipp: von außen nach innen denken: Klasse, dann main, dann Anweisungen.',
            falsche + ' of ' + ist.length + ' lines are still in the wrong place ' +
            '(outlined in red). Tip: think from the outside in: class, then main, then statements.');
        }
      });
    });
  });

  /* ------------------------------------------------------------- Lückentext */

  modul('cloze', function () {
    $$('.cloze').forEach(function (c) {
      var pruefen = $('.cloze-check', c), meldung = $('.cloze-meldung', c);
      if (!pruefen) return;
      if (meldung) { meldung.setAttribute('role', 'status'); meldung.setAttribute('aria-live', 'polite'); }

      /* Jedes Feld braucht einen Namen — vorher hatte keines ein Label. */
      $$('input.cz', c).forEach(function (inp, i) {
        if (!inp.getAttribute('aria-label')) inp.setAttribute('aria-label', T('Lücke ', 'Blank ') + (i + 1));
        /* Breit genug für die längste Antwort, geschrieben mit Leerzeichen um
           Operatoren, und beim Tippen wächst das Feld mit. */
        var laengste = (inp.getAttribute('data-a') || '').split('~').reduce(function (m, a) {
          var mitLuft = a.replace(/(&&|\|\||==|!=|<=|>=|[=+\-*\/%<>?:,])/g, ' $1 ');
          return Math.max(m, mitLuft.replace(/\s+/g, ' ').trim().length);
        }, 0);
        var grund = Math.max(+inp.getAttribute('size') || 0, laengste + 2);
        inp.setAttribute('size', grund);
        inp.addEventListener('input', function () {
          inp.setAttribute('size', Math.max(grund, inp.value.length + 2));
        });
      });

      var norm = function (s) { return s.replace(/\s+/g, ''); };

      pruefen.addEventListener('click', function () {
        var felder = $$('input.cz', c), richtig = 0, leer = 0;
        felder.forEach(function (inp) {
          var wert = norm(inp.value);
          if (wert === '') {
            /* Leer ist nicht falsch — es ist unbeantwortet. */
            leer++;
            inp.classList.remove('cz-ok', 'cz-bad');
            inp.setAttribute('aria-invalid', 'false');
            return;
          }
          /* Getrennt wird mit einer Tilde, nicht mit einem senkrechten Strich:
             In einem Java-Kurs ist `|` selbst eine gültige Antwort. */
          var ok = (inp.getAttribute('data-a') || '').split('~').some(function (a) {
            return norm(a) === wert;
          });
          /* data-muster: Wo mehrere Antworten richtig sind (etwa ein frei
             gewählter Variablenname), prüft ein regulärer Ausdruck. */
          var muster = inp.getAttribute('data-muster');
          if (!ok && muster) ok = new RegExp('^(?:' + muster + ')$').test(inp.value.trim());
          inp.classList.toggle('cz-ok', ok);
          inp.classList.toggle('cz-bad', !ok);
          inp.setAttribute('aria-invalid', ok ? 'false' : 'true');
          if (ok) richtig++;
        });
        if (!meldung) return;
        if (richtig === felder.length) {
          meldung.textContent = T('Alle Lücken richtig. So übersetzt das Programm.', 'All blanks correct. This is how the program is compiled.');
        } else if (leer) {
          meldung.textContent = T(richtig + ' von ' + felder.length + ' richtig, ' + leer +
            ' noch leer. Groß- und Kleinschreibung zählt.',
            richtig + ' of ' + felder.length + ' correct, ' + leer + ' still empty. Case matters.');
        } else {
          meldung.textContent = T(richtig + ' von ' + felder.length + ' richtig. Die rot ' +
            'umrandeten Lücken nochmal ansehen. Groß- und Kleinschreibung zählt.',
            richtig + ' of ' + felder.length + ' correct. Take another look at the blanks ' +
            'outlined in red. Case matters.');
        }
      });

      var nochmal = $('.cloze-reset', c);
      if (nochmal) nochmal.addEventListener('click', function () {
        $$('input.cz', c).forEach(function (inp) {
          inp.value = '';
          inp.classList.remove('cz-ok', 'cz-bad');
          inp.removeAttribute('aria-invalid');
        });
        if (meldung) meldung.textContent = T('Zurückgesetzt. Nochmal.', 'Reset. Try again.');
        var erstes = $('input.cz', c);
        if (erstes) erstes.focus();
      });
    });
  });

  /* ---------------------------------------------------- Wahrheitstabelle */
  /* Jede Antwortzelle ist ein Radio-Paar true/false (.wt[data-a]). Wählen
     geht ohne Skript; hier kommt nur das Prüfen dazu. Wer eine Zelle ändert,
     verliert für diese Zelle die alte Rückmeldung. */

  modul('wahrheit', function () {
    $$('.wahrheit').forEach(function (box) {
      var pruefen = $('.cloze-check', box), meldung = $('.cloze-meldung', box);
      var gruppen = $$('.wt[data-a]', box);
      if (!pruefen || !gruppen.length) return;
      if (meldung) { meldung.setAttribute('role', 'status'); meldung.setAttribute('aria-live', 'polite'); }

      gruppen.forEach(function (g) {
        g.addEventListener('change', function () {
          g.parentNode.classList.remove('wt-ok', 'wt-bad');
        });
      });

      pruefen.addEventListener('click', function () {
        var richtig = 0, leer = 0;
        gruppen.forEach(function (g) {
          var wahl = $('input:checked', g), zelle = g.parentNode;
          zelle.classList.remove('wt-ok', 'wt-bad');
          if (!wahl) { leer++; return; }
          var ok = wahl.value === g.getAttribute('data-a');
          zelle.classList.add(ok ? 'wt-ok' : 'wt-bad');
          if (ok) richtig++;
        });
        if (!meldung) return;
        var n = gruppen.length;
        if (richtig === n) meldung.textContent = T('Alle ' + n + ' Zellen richtig.', 'All ' + n + ' cells correct.');
        else if (leer) meldung.textContent = T(richtig + ' von ' + n + ' richtig, ' + leer + ' noch offen.', richtig + ' of ' + n + ' correct, ' + leer + ' still open.');
        else meldung.textContent = T(richtig + ' von ' + n + ' richtig. Die roten Zellen nochmal ansehen.', richtig + ' of ' + n + ' correct. Take another look at the red cells.');
      });
    });
  });

  /* ------------------------------------------------------------- Einstieg */
  /* Jedes Kapitel beginnt mit einem Problem: erst das Programm ohne das neue
     Werkzeug ausführen und stolpern, dann mit ihm. Ohne JavaScript steht alles
     offen da; das Skript blendet nur aus, was noch nicht dran ist. Statische
     Ausgaben (.einstieg-ausgabe) zeigt ein Knopf .einstieg-zeige. */

  modul('einstieg', function () {
    $$('.einstieg').forEach(function (box) {
      var haken = $('.einstieg-haken', box), mit = $('.einstieg-mit', box),
          knopf = $('.einstieg-knopf', box);
      if (!haken || !mit || !knopf) return;
      haken.hidden = true;
      mit.hidden = true;
      $$('.einstieg-ausgabe', box).forEach(function (a) { a.hidden = true; });

      function hakenZeigen() { haken.hidden = false; }

      $$('.einstieg-zeige', box).forEach(function (b) {
        b.addEventListener('click', function () {
          var teil = b.closest('.codebox');
          var a = teil && $('.einstieg-ausgabe', teil);
          if (a) a.hidden = false;
          b.disabled = true;
          if (b.closest('.einstieg-ohne')) window.setTimeout(hakenZeigen, sanft ? 0 : 500);
        });
      });
      $$('.einstieg-ohne .run-btn', box).forEach(function (b) {
        b.addEventListener('click', function () { window.setTimeout(hakenZeigen, sanft ? 0 : 900); });
      });

      knopf.addEventListener('click', function () {
        mit.hidden = false;
        knopf.disabled = true;
        mit.scrollIntoView({ behavior: sanft ? 'auto' : 'smooth', block: 'nearest' });
        var los = $('.run-btn, .einstieg-zeige', mit);
        if (los) los.focus({ preventScroll: true });
      });
    });
  });

  /* ---------------------------------------------------------------- Quiz */
  /* Richtig und falsch werden nie allein über Farbe gesagt: Zeichen, Wort
     und Farbe zusammen. Die Auswertung steht in einer aria-live-Region. */

  /** Ein Quiz verdrahten: Antworten auswerten, Ergebnis melden und sichern. */
  function initQuiz(quiz) {
    (function () {
      var fragen = $$('.qq', quiz);
      var ergebnis = $('.quiz-ergebnis', quiz);
      var beantwortet = 0, richtig = 0;

      if (ergebnis) { ergebnis.setAttribute('role', 'status'); ergebnis.setAttribute('aria-live', 'polite'); }

      fragen.forEach(function (frage) {
        var optionen = $$('.qq-opt button', frage);
        var erklaerung = $('.qq-erklaerung', frage);

        optionen.forEach(function (b) {
          /* Zeichenplatz für Haken/Kreuz — steht schon da, damit nichts springt. */
          if (!$('.marke-i', b)) {
            b.insertAdjacentHTML('afterbegin',
              '<svg class="i marke-i" aria-hidden="true" focusable="false"><use href="#i-richtig"></use></svg>');
          }
          b.addEventListener('click', function () {
            if (frage.classList.contains('beantwortet')) return;
            frage.classList.add('beantwortet');
            beantwortet++;

            var ok = b.hasAttribute('data-ok');
            if (ok) richtig++;

            optionen.forEach(function (o) {
              o.disabled = true;
              var istRichtig = o.hasAttribute('data-ok');
              if (istRichtig) {
                o.classList.add('richtig');
                $('.marke-i use', o).setAttribute('href', '#i-richtig');
                o.insertAdjacentHTML('beforeend', '<span class="nur-sr">' + T(', richtige Antwort', ', correct answer') + '</span>');
              } else if (o === b) {
                o.classList.add('falsch');
                $('.marke-i use', o).setAttribute('href', '#i-falsch');
                o.insertAdjacentHTML('beforeend', '<span class="nur-sr">' + T(', deine Antwort, falsch', ', your answer, wrong') + '</span>');
              }
            });

            if (erklaerung) {
              var warum = b.getAttribute('data-why');
              if (!ok && warum) {
                erklaerung.innerHTML = '<p><strong>' + T('Warum das nicht stimmt:', 'Why this is wrong:') + '</strong> ' + warum + '</p>' +
                  erklaerung.innerHTML;
              }
              erklaerung.hidden = false;
            }
            if (beantwortet === fragen.length) abschluss();
          });
        });
      });

      function abschluss() {
        if (!ergebnis) return;
        var q = richtig / fragen.length, text;
        if (q === 1) text = T('Alles richtig.', 'All correct.');
        else if (q >= 0.7) text = T('Stark. Wirf nur nochmal einen Blick auf die falsch beantwortete Frage.', 'Strong. Just take another look at the question you got wrong.');
        else if (q >= 0.4) text = T('Solide Basis. Scroll zu den Stellen zurück, die gewackelt haben.', 'A solid base. Scroll back to the parts that wobbled.');
        else text = T('Kein Stress, dafür ist das Quiz da. Lies das Kapitel nochmal in Ruhe. Beim zweiten Mal sitzt es meistens.', 'No stress, that is what the quiz is for. Read the chapter again in peace. The second time it usually sticks.');

        ergebnis.innerHTML = '<strong>' + T(richtig + ' von ' + fragen.length + ' richtig.', richtig + ' of ' + fragen.length + ' correct.') + '</strong> ' + text;
        ergebnis.hidden = false;
        if (!sanft) ergebnis.classList.add('tinte-an');
      }
    })();
  }

  modul('quiz', function () {
    $$('.quiz').forEach(function (quiz) { initQuiz(quiz); });
  });

  /* Für die Kapitelskripte. */
  window.CC = {
    $: $, $$: $$,
    modul: modul,
    icon: icon,
    esc: esc,
    faerbe: faerbe,
    sanft: sanft
  };
})();
