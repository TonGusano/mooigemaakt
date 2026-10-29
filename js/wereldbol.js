/* MooiGemaakt – het logo als draaiende wereldbol (zelfde techniek als de ECKU-wereldbol).
   Zonder JavaScript blijft het gewone logo stilstaan. Klik op de bol om hem te pauzeren. */
(function () {
  document.querySelectorAll('.mg-globe').forEach(function (box) {
    var fallback = box.querySelector('img');
    var img = new Image();
    img.onload = function () { start(box, img, fallback); };
    img.src = box.dataset.src;
  });

  function start(box, img, fallback) {
    var weinigBeweging = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var omloop = (parseFloat(box.dataset.seconds) || 24) * 1000; // ms per volledige draai

    // Logo als "textuur" inlezen
    var T = 768;
    var tc = document.createElement('canvas'); tc.width = tc.height = T;
    var tctx = tc.getContext('2d');
    tctx.drawImage(img, 0, 0, T, T);
    var tex = new Uint32Array(tctx.getImageData(0, 0, T, T).data.buffer);

    var canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', fallback ? fallback.alt : 'Logo van MooiGemaakt');
    var ctx = canvas.getContext('2d');
    var S, out, buf, n, idx, nx, nz, ny, shade, edge;

    function opbouwen() {
      var css = box.getBoundingClientRect().width || 380;
      S = Math.min(720, Math.round(css * Math.min(window.devicePixelRatio || 1, 2)));
      canvas.width = canvas.height = S;
      out = ctx.createImageData(S, S);
      buf = new Uint32Array(out.data.buffer);

      // Vooraf per pixel uitrekenen wat niet verandert tijdens het draaien
      var R = S / 2 - 1, c = S / 2, list = [];
      var L = [-0.45, -0.55, 0.70], Ll = Math.hypot(L[0], L[1], L[2]);
      L = L.map(function (v) { return v / Ll; });
      for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
        var px = (x + 0.5 - c) / R, py = (y + 0.5 - c) / R, d2 = px * px + py * py;
        if (d2 >= 1) continue;
        var pz = Math.sqrt(1 - d2);
        var diff = Math.max(0, px * L[0] + py * L[1] + pz * L[2]);
        var spec = Math.pow(diff, 40) * 0.30;
        var lum = (0.62 + 0.48 * diff) * (0.86 + 0.14 * pz);
        var aa = Math.min(1, (1 - Math.sqrt(d2)) * R); // zachte rand
        list.push([y * S + x, px, py, pz, lum, spec, aa]);
      }
      n = list.length;
      idx = new Int32Array(n); nx = new Float32Array(n); ny = new Float32Array(n); nz = new Float32Array(n);
      shade = new Float32Array(n); edge = new Float32Array(n);
      var specArr = new Float32Array(n);
      list.forEach(function (p, i) {
        idx[i] = p[0]; nx[i] = p[1]; ny[i] = p[2]; nz[i] = p[3];
        shade[i] = p[4]; specArr[i] = p[5]; edge[i] = p[6];
      });
      opbouwen.spec = specArr;
    }

    function teken(hoek) {
      var cs = Math.cos(hoek), sn = Math.sin(hoek), half = T / 2, k = 0.985 * half;
      var spec = opbouwen.spec;
      buf.fill(0);
      for (var i = 0; i < n; i++) {
        var x = nx[i], z = nz[i];
        var ox = x * cs - z * sn, oz = x * sn + z * cs, oy = ny[i];
        // Voorkant: logo; achterkant: logo gespiegeld zodat het weer leesbaar is als het rondkomt
        var u = (oz >= 0 ? ox : -ox) * k + half, v = oy * k + half;
        var t = tex[(v | 0) * T + (u | 0)];
        var r = t & 255, g = (t >> 8) & 255, b = (t >> 16) & 255;
        var s = shade[i], sp = spec[i] * 255;
        r = r * s + sp; g = g * s + sp; b = b * s + sp;
        if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255;
        buf[idx[i]] = ((edge[i] * 255) << 24) | (b << 16) | (g << 8) | r;
      }
      ctx.putImageData(out, 0, 0);
    }

    opbouwen();
    if (fallback) fallback.remove();
    box.appendChild(canvas);

    // Bij "Beperk beweging" draait de bol extra rustig; met een klik zet je hem stil
    if (weinigBeweging) omloop *= 1.6;

    var hoek = 0, vorige = 0, frame = null, inBeeld = false, stil = false;
    function loop(nu) {
      hoek += ((nu - (vorige || nu)) / omloop) * Math.PI * 2;
      vorige = nu;
      teken(hoek);
      frame = requestAnimationFrame(loop);
    }
    function bijwerken() {
      var moet = inBeeld && !stil;
      if (moet && !frame) { vorige = 0; frame = requestAnimationFrame(loop); }
      if (!moet && frame) { cancelAnimationFrame(frame); frame = null; }
    }
    teken(0);
    // Alleen draaien als de bol in beeld is (bespaart batterij)
    new IntersectionObserver(function (e) { inBeeld = e[0].isIntersecting; bijwerken(); }).observe(box);
    box.style.cursor = 'pointer';
    box.title = 'Klik om te pauzeren of verder te draaien';
    box.addEventListener('click', function () { stil = !stil; bijwerken(); });
    window.addEventListener('resize', function () { opbouwen(); teken(hoek); });
  }
})();
