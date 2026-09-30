/* =========================================================
   App · arranque, vistas, entrada y modo maestro
   ========================================================= */
window.App = (function (global) {

  var $ = function (id) { return document.getElementById(id); };
  var VISTAS = { login: 'vLogin', claseNueva: 'vClaseNueva', inicio: 'vInicio', elegir: 'vElegir',
                 auto: 'vAuto', resultado: 'vResultado', maestro: 'vMaestro' };
  var actual = null;
  var MUSICA = { claseNueva: 'inicio', inicio: 'inicio', elegir: 'inicio', auto: 'auto', maestro: 'maestro' };
  var INACTIVIDAD_MS = 5 * 60 * 1000;
  var temporizadorMaestro = null;
  var pestana = 'revision';

  /* ---------------- utilidades ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function ir(nombre) {
    actual = nombre;
    Object.keys(VISTAS).forEach(function (k) { $(VISTAS[k]).classList.toggle('activa', k === nombre); });
    document.documentElement.classList.toggle('en-maestro', nombre === 'maestro');
    /* música de cada zona; en el resultado se corta rápido para dejar
       sitio a la celebración, y en la pantalla de entrar no suena nada */
    Sonido.musica(MUSICA[nombre] || null, nombre === 'resultado');
  }
  function vista() { return actual; }

  function aviso(texto, tipo) {
    var cont = $('avisos');
    var el = document.createElement('div');
    el.className = 'aviso-flota ' + (tipo || '');
    el.textContent = texto;
    cont.appendChild(el);
    setTimeout(function () { el.classList.add('fuera'); }, tipo === 'mal' ? 5200 : 2600);
    setTimeout(function () { el.remove(); }, tipo === 'mal' ? 5600 : 3000);
  }

  function cargando(si, texto) {
    $('cargandoTxt').textContent = texto || 'Cargando…';
    $('cargando').classList.toggle('oculto', !si);
  }

  /* Las animaciones solo se reducen si lo decide el maestro en los
     ajustes de la clase: el ajuste del sistema (prefers-reduced-motion)
     se ignora a propósito, igual que en los juegos. */
  function animar() { return !(Datos.clase && Datos.clase.animaciones_reducidas); }

  function aplicarClase() {
    document.documentElement.classList.toggle('sin-anim', !animar());
    if (Datos.clase) $('maClase').textContent = Datos.clase.nombre;
  }

  /* ---------------- indicador de envío ---------------- */
  function pintarSync(e) {
    var el = $('inSync');
    e = e || Cola.estado();
    if (!e.pendientes) { el.classList.add('oculto'); return; }
    el.classList.remove('oculto');
    el.textContent = (e.fallo === 'red' ? '☁️✕ ' : '☁️↑ ') + e.pendientes;
    el.title = e.fallo === 'red'
      ? e.pendientes + ' cambios guardados en este ordenador; se enviarán cuando vuelva la conexión'
      : 'Enviando ' + e.pendientes + ' cambios…';
  }

  /* ---------------- entrada ---------------- */
  function conectarLogin() {
    $('loginLogo').innerHTML = Iconos.html('bote', 'ico-logo');
    $('claseLogo').innerHTML = Iconos.html('escuela', 'ico-logo');
    $('lgMantener').checked = Nube.recordar();
    $('loginForm').onsubmit = function (e) {
      e.preventDefault();
      var mal = $('lgMal');
      mal.classList.add('oculto');
      $('lgEntrar').disabled = true;
      $('lgEntrar').textContent = 'Entrando…';
      Nube.entrar($('lgUsuario').value, $('lgClave').value, $('lgMantener').checked)
        .then(function () {
          $('lgClave').value = '';
          return cargarDatos();
        })
        .catch(function (err) {
          mal.textContent = err.message;
          mal.classList.remove('oculto');
          FX.repetir($('loginForm'), 'tiembla', 400);
        })
        .then(function () { $('lgEntrar').disabled = false; $('lgEntrar').textContent = 'Entrar'; });
    };
    $('claseForm').onsubmit = function (e) {
      e.preventDefault();
      var nombre = $('cnNombre').value.trim();
      var mal = $('cnMal');
      if (!nombre) { mal.textContent = 'Escribe el nombre de la clase.'; mal.classList.remove('oculto'); return; }
      $('cnCrear').disabled = true;
      Datos.crearClase(nombre.slice(0, 60), $('cnCurso').value.trim().slice(0, 20))
        .then(function () { aplicarClase(); Pizarra.inicio(); })
        .catch(function (err) { mal.textContent = err.message; mal.classList.remove('oculto'); })
        .then(function () { $('cnCrear').disabled = false; });
    };
    $('cnSalir').onclick = function () { cerrarSesion(); };
  }

  function mostrarLogin(mensaje) {
    ir('login');
    var mal = $('lgMal');
    if (mensaje) { mal.textContent = mensaje; mal.classList.remove('oculto'); }
    else mal.classList.add('oculto');
    setTimeout(function () { $('lgUsuario').focus(); }, 60);
  }

  function cargarDatos() {
    cargando(true);
    return Datos.cargar().then(function (r) {
      cargando(false);
      Cola.vaciar();
      Nube.comprobarAdmin();
      aplicarClase();
      if (r.sinRed) aviso('Sin conexión: se trabaja con lo guardado en este ordenador');
      if (!Datos.clase) {
        if (r.sinRed) { mostrarLogin('No hay conexión y en este ordenador aún no hay ninguna clase guardada.'); return; }
        ir('claseNueva');
        setTimeout(function () { $('cnNombre').focus(); }, 60);
        return;
      }
      Pizarra.inicio();
    }).catch(function (err) {
      cargando(false);
      mostrarLogin(err.message);
    });
  }

  function cerrarSesion() {
    salirMaestro(true);
    Nube.salir().then(function () {
      $('lgUsuario').value = '';
      mostrarLogin();
    });
  }

  /* ---------------- modo maestro ---------------- */
  function entrarMaestro() {
    /* sin PIN: la clase vería cómo se escribe. Se cierra solo tras 5 min sin uso. */
    if (!Nube.usuario()) return;
    ir('maestro');
    abrirPestana(Datos.alumnos.length ? pestana : 'alumnado');
    vigilar();
  }

  function abrirPestana(p) {
    pestana = p;
    Array.prototype.forEach.call($('maPestanas').children, function (b) {
      b.classList.toggle('on', b.getAttribute('data-p') === p);
    });
    ['revision', 'puntos', 'premios', 'alumnado', 'objetivos', 'ajustes'].forEach(function (k) {
      var panel = $('p' + k.charAt(0).toUpperCase() + k.slice(1));
      panel.classList.toggle('activa', k === p);
      if (k !== p) panel.innerHTML = '';
    });
    ({ revision: Revision, puntos: Puntos, premios: Premios, alumnado: Alumnado, objetivos: Objetivos, ajustes: Ajustes })[p].abrir();
  }

  /* Cierre automático tras 5 minutos sin actividad */
  function vigilar() {
    clearTimeout(temporizadorMaestro);
    if (actual !== 'maestro') return;
    temporizadorMaestro = setTimeout(function () {
      if (actual !== 'maestro') return;
      salirMaestro();
      aviso('Modo maestro cerrado por inactividad');
    }, INACTIVIDAD_MS);
  }
  ['pointerdown', 'keydown', 'wheel', 'input'].forEach(function (t) {
    document.addEventListener(t, function () { if (actual === 'maestro') vigilar(); }, { passive: true, capture: true });
  });

  function salirMaestro(sinInicio) {
    clearTimeout(temporizadorMaestro);
    /* se cierran las ventanas que pudieran quedar abiertas del maestro */
    Array.prototype.forEach.call(document.querySelectorAll('.capa.ver'), function (c) {
      if (c.id !== 'capaDialogo') c.classList.remove('ver');
    });
    ['pRevision', 'pPuntos', 'pPremios', 'pAlumnado', 'pObjetivos', 'pAjustes'].forEach(function (id) { $(id).innerHTML = ''; });
    if (!sinInicio && Datos.clase) Pizarra.inicio();
  }

  /* tras borrar la clase del curso */
  function trasBorrarClase() {
    salirMaestro(true);
    aplicarClase();
    if (Datos.clase) Pizarra.inicio();
    else { ir('claseNueva'); }
  }

  /* ---------------- fondo animado ----------------
     Formas suaves que suben despacio. Solo se animan transform y
     opacity (lo mueve la tarjeta gráfica, casi sin gastar CPU), sin
     desenfoques, y son pocas. Con «Animaciones reducidas» se quitan. */
  function crearFlotantes() {
    var FORMAS = ['circulo', 'aro', 'estrella', 'cuadro', 'circulo', 'estrella', 'aro'];
    var html = '';
    for (var i = 0; i < 14; i++) {
      var lado = 18 + ((i * 37) % 54);                       // 18–71 px
      var x = (i * 71 + 7) % 100;                             // repartidas por el ancho
      var dur = 26 + ((i * 13) % 22);                         // 26–47 s por subida
      var retraso = -((i * 7.3) % dur).toFixed(1);            // ya en marcha al empezar
      var giro = (i % 2 ? 1 : -1) * (90 + (i * 23) % 180);
      html += '<i class="' + FORMAS[i % FORMAS.length] + '" style="left:' + x + '%;width:' + lado + 'px;height:' + lado +
        'px;animation-duration:' + dur + 's;animation-delay:' + retraso + 's;--giro:' + giro + 'deg;--op:' + (0.10 + (i % 4) * 0.04).toFixed(2) + '"></i>';
    }
    $('flotantes').innerHTML = html;
  }

  /* ---------------- arranque ---------------- */
  function arrancar() {
    conectarLogin();
    Pizarra.conectar();
    $('maPestanas').onclick = function (e) {
      var b = e.target.closest('button[data-p]');
      if (b) { Sonido.click(); abrirPestana(b.getAttribute('data-p')); }
    };
    $('maSalir').onclick = function () { Sonido.click(); salirMaestro(); };
    $('maCerrar').onclick = function () { Sonido.click(); Ajustes.salir(); };
    $('inCerrar').onclick = function () { Sonido.click(); Ajustes.salir(); };
    crearFlotantes();
    document.addEventListener('cola', function (e) { pintarSync(e.detail); });
    document.addEventListener('cuenta', function (e) {
      if (!e.detail && actual && actual !== 'login') mostrarLogin('La sesión se ha cerrado. Vuelve a entrar.');
    });

    if (!Nube.configurada) {
      cargando(false);
      mostrarLogin('Falta conectar la base de datos: rellena js/config.js (mira supabase/GUIA-SUPABASE.md).');
      return;
    }
    Nube.iniciar().then(function (u) {
      if (u) cargarDatos();
      else { cargando(false); mostrarLogin(); }
    });
  }

  document.addEventListener('DOMContentLoaded', arrancar);

  return {
    esc: esc, ir: ir, vista: vista, aviso: aviso, cargando: cargando,
    animar: animar, aplicarClase: aplicarClase,
    entrarMaestro: entrarMaestro, salirMaestro: salirMaestro,
    cerrarSesion: cerrarSesion, trasBorrarClase: trasBorrarClase
  };

})(window);
