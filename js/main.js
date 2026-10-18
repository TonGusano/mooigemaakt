/* MooiGemaakt – lichte interactie: mobiel menu, portfoliofilters,
   formuliercontrole en rustige scroll-animaties. Geen externe bibliotheken. */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  /* Mobiel menu ----------------------------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('hoofdmenu');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* Jaartal in de footer -------------------------------------------------- */
  var year = document.getElementById('jaar');
  if (year) year.textContent = new Date().getFullYear();

  /* Portfoliofilters ------------------------------------------------------ */
  var filterButtons = document.querySelectorAll('.filter-btn');
  var projects = document.querySelectorAll('[data-category]');
  var filterStatus = document.getElementById('filter-status');
  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var filter = btn.getAttribute('data-filter');
      var shown = 0;
      filterButtons.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      projects.forEach(function (p) {
        var match = filter === 'alles' || p.getAttribute('data-category').split(' ').indexOf(filter) !== -1;
        p.hidden = !match;
        if (match) shown++;
      });
      if (filterStatus) {
        filterStatus.textContent = shown + (shown === 1 ? ' voorbeeld' : ' voorbeelden') + ' getoond.';
      }
    });
  });

  /* Placeholder-links in het portfolio ------------------------------------ */
  document.querySelectorAll('[data-placeholder-link]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      link.textContent = 'Voorbeeld volgt binnenkort';
    });
  });

  /* Contactformulier ------------------------------------------------------ */
  var form = document.getElementById('contactformulier');
  if (form) {
    var status = document.getElementById('formulier-status');
    var messages = {
      naam: 'Vul je naam in, zodat ik weet met wie ik contact heb.',
      email: 'Vul een geldig e-mailadres in, bijvoorbeeld naam@voorbeeld.nl.',
      onderwerp: 'Kies waar je vraag over gaat. Twijfel je? Kies dan “Anders”.',
      bericht: 'Vertel in een paar zinnen wat je wilt laten maken.',
      voorwie: 'Vul in voor wie het bedoeld is, bijvoorbeeld je bedrijf, vereniging of familie.',
      contactvoorkeur: 'Kies hoe je het liefst contact hebt.',
      toestemming: 'Vink dit vakje aan om je bericht te kunnen versturen.'
    };

    var setError = function (name, text) {
      var fields = form.querySelectorAll('[name="' + name + '"]');
      var error = document.getElementById('fout-' + name);
      if (error) error.textContent = text || '';
      fields.forEach(function (f) {
        if (text) f.setAttribute('aria-invalid', 'true');
        else f.removeAttribute('aria-invalid');
      });
    };

    var validateField = function (name) {
      var field = form.elements[name];
      if (!field) return true;
      var valid;
      if (field instanceof RadioNodeList) {
        valid = field.value !== '';
      } else if (field.type === 'checkbox') {
        valid = field.checked;
      } else if (field.type === 'email') {
        valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(field.value.trim());
      } else {
        valid = field.value.trim() !== '';
      }
      setError(name, valid ? '' : messages[name]);
      return valid;
    };

    Object.keys(messages).forEach(function (name) {
      form.querySelectorAll('[name="' + name + '"]').forEach(function (f) {
        f.addEventListener('change', function () { validateField(name); });
      });
    });

    var showStatus = function (type, text) {
      status.className = 'form-status form-status--' + type;
      status.textContent = text;
    };

    if (/[?&]verzonden=1/.test(location.search)) {
      showStatus('ok', 'Bedankt voor je bericht. Ik lees het rustig door en neem contact met je op.');
    } else if (/[?&]fout=1/.test(location.search)) {
      showStatus('error', 'Het versturen is niet gelukt. Probeer het later opnieuw of stuur een e-mail.');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstInvalid = null;
      Object.keys(messages).forEach(function (name) {
        if (!validateField(name) && !firstInvalid) {
          firstInvalid = form.querySelector('[name="' + name + '"]');
        }
      });
      if (firstInvalid) {
        showStatus('error', 'Nog niet alles is ingevuld. Kijk de gemarkeerde velden even na.');
        firstInvalid.focus();
        return;
      }

      var button = form.querySelector('[type="submit"]');
      button.disabled = true;
      showStatus('info', 'Je bericht wordt verstuurd…');
      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          if (!response.ok || !data.ok) throw new Error(data.melding || '');
        });
      }).then(function () {
        form.reset();
        showStatus('ok', 'Bedankt voor je bericht. Ik lees het rustig door en neem contact met je op.');
      }).catch(function (err) {
        showStatus('error', (err && err.message) || 'Het versturen is niet gelukt. Probeer het later opnieuw of stuur een e-mail.');
      }).then(function () {
        button.disabled = false;
      });
    });
  }

  /* Titels op één regel ---------------------------------------------------
     Past een titel net niet op één regel, dan wordt hij iets kleiner gezet.
     Wordt hij daardoor te klein (meer dan 20% kleiner, of onder 24 px),
     dan blijft hij op de gewone grootte over twee regels staan. */
  var fitTitles = function () {
    document.querySelectorAll('main h1, main h2').forEach(function (h) {
      h.style.fontSize = '';
      var base = parseFloat(getComputedStyle(h).fontSize);
      if (base < 26) return;
      var available = h.clientWidth;
      h.style.whiteSpace = 'nowrap';
      var needed = h.scrollWidth;
      h.style.whiteSpace = '';
      if (needed <= available) return;
      var size = Math.floor(base * (available / needed) * 10) / 10 - 0.2;
      if (size >= base * 0.8 && size >= 24) h.style.fontSize = size + 'px';
    });
  };
  fitTitles();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitles);
  var fitTimer;
  window.addEventListener('resize', function () {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitTitles, 150);
  });

  /* Rustige scroll-animatie ----------------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { observer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }
})();
