// Bladerboek met de handleiding op nabestaanden.html (gebruikt page-flip.min.js).
// De pagina's worden pas geladen als het blok bijna in beeld is.
(function () {
  var boek = document.getElementById('bladerboek');
  if (!boek || !window.St || !window.St.PageFlip) return;
  var knoppen = document.querySelector('.bladerboek-knoppen');
  var teller = knoppen.querySelector('.bladerboek-teller');
  var paginas = boek.querySelectorAll('.bladerboek-pagina');
  var totaal = paginas.length;

  function start() {
    boek.querySelectorAll('img[data-src]').forEach(function (img) {
      img.src = img.getAttribute('data-src');
      img.removeAttribute('data-src');
    });
    boek.classList.add('is-klaar');
    var flip = new window.St.PageFlip(boek, {
      width: 450, height: 637, size: 'stretch',
      minWidth: 260, maxWidth: 400, minHeight: 368, maxHeight: 566,
      showCover: true, usePortrait: true, mobileScrollSupport: true,
      maxShadowOpacity: 0.35, flippingTime: 700
    });
    flip.loadFromHTML(paginas);

    function toonTeller() {
      var i = flip.getCurrentPageIndex();
      var tekst;
      if (i === 0) tekst = 'Voorkant';
      else if (i >= totaal - 1) tekst = 'Achterkant';
      else if (flip.getOrientation() === 'portrait') tekst = 'Pagina ' + (i + 1) + ' van ' + totaal;
      else {
        var links = i % 2 ? i : i - 1;
        tekst = 'Pagina ' + (links + 1) + '–' + (links + 2) + ' van ' + totaal;
      }
      teller.textContent = tekst;
    }
    flip.on('flip', toonTeller);
    flip.on('changeOrientation', toonTeller);
    knoppen.querySelector('[data-blader="vorige"]').addEventListener('click', function () { flip.flipPrev(); });
    knoppen.querySelector('[data-blader="volgende"]').addEventListener('click', function () { flip.flipNext(); });
    knoppen.hidden = false;
    toonTeller();
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (items) {
      if (items.some(function (x) { return x.isIntersecting; })) { io.disconnect(); start(); }
    }, { rootMargin: '400px 0px' });
    io.observe(boek);
  } else {
    start();
  }
})();
