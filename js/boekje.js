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

    // ---------- Schermvullend bekijken ----------
    var blok = boek.closest('.bladerboek');
    var groot = blok.querySelector('.bladerboek-groot');
    var grootKnop = groot.querySelector('button');
    var instelling = flip.getSettings();
    var normaal = { maxWidth: instelling.maxWidth, maxHeight: instelling.maxHeight };
    var verhouding = 1274 / 900; // hoogte gedeeld door breedte van een pagina
    var open = false;

    // Bereken hoe groot een pagina mag zijn zodat het boek precies in het venster past
    function pasGrootteAan() {
      var omhulsel = boek; // page-flip zet de maximale breedte op het boekblok zelf
      if (!open) {
        instelling.maxWidth = normaal.maxWidth;
        instelling.maxHeight = normaal.maxHeight;
        omhulsel.style.maxWidth = (2 * normaal.maxWidth) + 'px';
      } else {
        var ruimteB = blok.clientWidth - 32;
        var ruimteH = window.innerHeight - knoppen.offsetHeight - 110;
        var staand = ruimteB < 2 * instelling.minWidth;
        var breedte = Math.max(instelling.minWidth, Math.min(staand ? ruimteB : ruimteB / 2, ruimteH / verhouding));
        instelling.maxWidth = breedte;
        instelling.maxHeight = breedte * verhouding;
        omhulsel.style.maxWidth = ((staand ? 1 : 2) * breedte) + 'px';
      }
      flip.update();
    }

    function zetSchermvullend(aan) {
      if (open === aan) return;
      open = aan;
      blok.classList.toggle('is-schermvullend', aan);
      document.documentElement.classList.toggle('bladerboek-open', aan);
      grootKnop.textContent = aan ? '✕ Sluiten' : '⤢ Schermvullend bekijken';
      grootKnop.setAttribute('aria-pressed', String(aan));
      if (aan && blok.requestFullscreen) blok.requestFullscreen().catch(function () {});
      if (!aan && document.fullscreenElement) document.exitFullscreen().catch(function () {});
      requestAnimationFrame(pasGrootteAan);
      if (!aan) blok.scrollIntoView({ block: 'center' });
    }

    grootKnop.addEventListener('click', function () { zetSchermvullend(!open); });
    document.addEventListener('fullscreenchange', function () {
      if (!document.fullscreenElement && open) zetSchermvullend(false);
      else if (open) requestAnimationFrame(pasGrootteAan);
    });
    window.addEventListener('resize', function () { if (open) pasGrootteAan(); });
    document.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape') zetSchermvullend(false);
      else if (e.key === 'ArrowRight') flip.flipNext();
      else if (e.key === 'ArrowLeft') flip.flipPrev();
    });
    groot.hidden = false;
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
