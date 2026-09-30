/* =========================================================
   Sonido · los mismos archivos que en Juegos de aula
     click.wav    pulsación (también el «Hoy no» y el «No ha venido»)
     acierto.mp3  «¡Lo conseguí!»
     fin.mp3      celebración del objetivo conseguido (se corta sola)
   El error.mp3 NO se incluye a propósito: aquí no hay «fallos».
   ========================================================= */
window.Sonido = (function (global) {

  var RUTA = 'audio/';
  var K = 'classmojo.sonido';
  var activo = true;
  try { activo = localStorage.getItem(K) !== '0'; } catch (e) {}

  var SFX = {
    click: { archivo: 'click.wav', vol: 0.55 },
    si:    { archivo: 'acierto.mp3', vol: 0.8 }
  };
  Object.keys(SFX).forEach(function (n) {
    var s = SFX[n];
    s.copias = [new Audio(RUTA + s.archivo)];
    s.copias[0].preload = 'auto';
    s.i = 0;
  });

  /* varias copias por efecto: dos pulsaciones seguidas no se cortan */
  function suena(nombre) {
    if (!activo) return;
    var s = SFX[nombre];
    try {
      if (s.copias.length < 3) s.copias.push(new Audio(RUTA + s.archivo));
      var a = s.copias[s.i++ % s.copias.length];
      a.volume = s.vol;
      a.currentTime = 0;
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  /* fin.mp3 es la música del podio: aquí suenan sus primeros segundos
     y se desvanece. */
  var fiestaAudio = null, fiestaTimer = null;
  function fiesta(ms) {
    if (!activo) return;
    parar();
    try {
      fiestaAudio = fiestaAudio || new Audio(RUTA + 'fin.mp3');
      fiestaAudio.volume = 0.8;
      fiestaAudio.currentTime = 0;
      var p = fiestaAudio.play();
      if (p && p.catch) p.catch(function () {});
      fiestaTimer = setTimeout(function () { desvanecer(fiestaAudio); }, ms || 5000);
    } catch (e) {}
  }
  function desvanecer(a) {
    if (!a) return;
    var paso = setInterval(function () {
      var v = a.volume - 0.08;
      if (v <= 0.02) { clearInterval(paso); try { a.pause(); } catch (e) {} return; }
      a.volume = v;
    }, 60);
  }
  function parar() {
    clearTimeout(fiestaTimer);
    if (fiestaAudio) { try { fiestaAudio.pause(); } catch (e) {} }
  }

  /* ---------------- música de fondo ----------------
     Una pista por zona, todas de Pixabay (licencia de contenido de
     Pixabay), en bucle y bajitas:
       inicio   inicio.mp3   «Kids - Kids Music», Verclub_Music (2:50)
       auto     fondo.mp3    «Relaxing Music», Verclub_Music (8:40)
       maestro  maestro.mp3  «Soft Guitar», The_Mountain (2:20)
       exito    fin.mp3      la del podio de Juegos de aula: objetivo conseguido
       animo    animo.mp3    «Positive Soft», The_Mountain (1:55): «¡Mañana otro!»
     Al cambiar de zona, la que suena se desvanece y se queda en pausa
     donde iba (las del resultado vuelven a empezar cada vez); la nueva
     entra poco a poco. Todas siguen hasta que se sale de su pantalla. Cada archivo solo se
     descarga la primera vez que se usa (preload none).
     Si el navegador no deja sonar sin un toque (al recargar la página
     con la sesión abierta), arranca con el primer clic o tecla. */
  var K_MUS = 'classmojo.musica';
  var PISTAS = {
    inicio:  { archivo: 'inicio.mp3',  vol: 0.12 },
    auto:    { archivo: 'fondo.mp3',   vol: 0.22 },
    maestro: { archivo: 'maestro.mp3', vol: 0.10 },
    exito:   { archivo: 'fin.mp3',     vol: 0.55, entrada: 200, desdeCero: true },
    animo:   { archivo: 'animo.mp3',   vol: 0.30, entrada: 600, desdeCero: true }
  };
  var musicaOn = true;
  try { musicaOn = localStorage.getItem(K_MUS) !== '0'; } catch (e) {}
  var zona = null;              // pista que debería sonar (o null)
  var armado = false;

  function fundir(p, hasta, ms, alAcabar) {
    clearInterval(p.fundido);
    var a = p.audio, desde = a.volume, pasos = Math.max(1, Math.round(ms / 50)), n = 0;
    p.fundido = setInterval(function () {
      n++;
      a.volume = Math.max(0, Math.min(1, desde + (hasta - desde) * n / pasos));
      if (n >= pasos) { clearInterval(p.fundido); if (alAcabar) alAcabar(); }
    }, 50);
  }

  function pista(nombre) {
    var p = PISTAS[nombre];
    if (!p.audio) {
      p.audio = new Audio(RUTA + p.archivo);
      p.audio.loop = true;
      p.audio.preload = 'none';
      p.audio.volume = 0;
    }
    return p;
  }

  function sonar(nombre) {
    var p = pista(nombre);
    if (!p.audio.paused) { fundir(p, p.vol, 500); return; }
    p.audio.volume = 0;
    if (p.desdeCero) { try { p.audio.currentTime = 0; } catch (e) {} }
    var entrada = p.entrada || 1500;
    var pr;
    try { pr = p.audio.play(); } catch (e) { armar(); return; }
    if (pr && pr.then) pr.then(function () { if (zona === nombre) fundir(p, p.vol, entrada); }, armar);
    else fundir(p, p.vol, entrada);
  }

  function callar(nombre, rapido) {
    var p = PISTAS[nombre];
    if (!p.audio || p.audio.paused) return;
    fundir(p, 0, rapido ? 300 : 900, function () { if (zona !== nombre) { try { p.audio.pause(); } catch (e) {} } });
  }

  /* el navegador ha bloqueado el sonido: se espera al primer gesto */
  function armar() {
    if (armado) return;
    armado = true;
    var gesto = function () {
      armado = false;
      document.removeEventListener('pointerdown', gesto, true);
      document.removeEventListener('keydown', gesto, true);
      if (zona && activo && musicaOn) sonar(zona);
    };
    document.addEventListener('pointerdown', gesto, true);
    document.addEventListener('keydown', gesto, true);
  }

  /* Pone la música de una zona ('inicio', 'auto', 'maestro') o ninguna (null) */
  function musica(nombre, rapido) {
    zona = nombre || null;
    Object.keys(PISTAS).forEach(function (k) { if (k !== zona) callar(k, rapido); });
    if (zona && activo && musicaOn) sonar(zona);
  }

  function musicaActivar(v) {
    if (v === undefined) return musicaOn;
    musicaOn = !!v;
    try { localStorage.setItem(K_MUS, musicaOn ? '1' : '0'); } catch (e) {}
    if (!musicaOn) Object.keys(PISTAS).forEach(function (k) { callar(k, true); });
    else if (zona && activo) sonar(zona);
    return musicaOn;
  }

  function activar(v) {
    if (v === undefined) return activo;
    activo = !!v;
    try { localStorage.setItem(K, activo ? '1' : '0'); } catch (e) {}
    if (!activo) { parar(); Object.keys(PISTAS).forEach(function (k) { callar(k, true); }); }
    else if (zona && musicaOn) sonar(zona);
    return activo;
  }

  return {
    click: function () { suena('click'); },
    si: function () { suena('si'); },
    fiesta: fiesta,
    parar: parar,
    activar: activar,
    musica: musica,
    musicaActivar: musicaActivar
  };

})(window);
