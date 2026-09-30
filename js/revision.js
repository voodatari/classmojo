/* =========================================================
   Revisión (modo maestro) · respuestas de un día
   Tocar una respuesta la cambia (sí → no → ausente → sí) y la
   marca como revisada. La base de datos recalcula el resultado
   de grupo y el bote; aquí se recalcula también al momento.
   ========================================================= */
window.Revision = (function () {

  var $ = function (id) { return document.getElementById(id); };
  var fecha = null, sesiones = [], revisadas = {};
  var CICLO = { si: 'no', no: 'ausente', ausente: 'si' };
  var ETIQUETA = { si: 'Sí', no: 'No', ausente: 'No vino' };

  function abrir() {
    fecha = fecha || Datos.hoy();
    var p = $('pRevision');
    p.innerHTML =
      '<div class="panel-cab">' +
        '<h2>Revisión</h2>' +
        '<div class="fila-fecha">' +
          '<button class="btn" id="rvAntes" title="Día anterior">◀</button>' +
          '<input type="date" class="campo" id="rvFecha">' +
          '<button class="btn" id="rvDespues" title="Día siguiente">▶</button>' +
          '<button class="btn" id="rvHoy">Hoy</button>' +
        '</div>' +
      '</div>' +
      '<p class="tenue">Toca una respuesta para cambiarla. Las cambiadas quedan marcadas con ✎.</p>' +
      '<div id="rvLista"></div>';
    $('rvFecha').value = fecha;
    $('rvFecha').max = Datos.hoy();
    $('rvFecha').onchange = function () { if (this.value) { fecha = this.value; cargar(); } };
    $('rvAntes').onclick = function () { mover(-1); };
    $('rvDespues').onclick = function () { mover(1); };
    $('rvHoy').onclick = function () { fecha = Datos.hoy(); $('rvFecha').value = fecha; cargar(); };
    $('rvLista').onclick = clic;
    cargar();
  }

  function mover(n) {
    var f = Datos.sumarDias(fecha, n);
    if (f > Datos.hoy()) return;
    fecha = f;
    $('rvFecha').value = fecha;
    cargar();
  }

  function cargar() {
    var pedida = fecha;
    $('rvLista').innerHTML = '<div class="cargando-linea"><div class="spinner mini"></div> Cargando…</div>';
    Datos.sesionesDelDia(fecha, true).then(function (r) {
      if (pedida !== fecha) return;
      sesiones = r.sesiones;
      revisadas = r.revisadas || {};
      pintar(r.sinRed);
    }).catch(function (e) {
      $('rvLista').innerHTML = '<p class="aviso mal">' + App.esc(e.message) + '</p>';
    });
  }

  function alumnosDe(s) {
    /* los activos en su orden y, además, los inactivos que respondieron */
    return Datos.alumnos.filter(function (a) { return a.activo || s.respuestas[a.id]; });
  }

  function pintar(sinRed) {
    if (!sesiones.length) {
      $('rvLista').innerHTML = '<div class="vacio">Este día no hay autoevaluaciones.</div>';
      return;
    }
    $('rvLista').innerHTML = (sinRed ? '<p class="aviso">Sin conexión: se ve lo guardado en este ordenador.</p>' : '') +
      sesiones.map(tarjeta).join('');
  }

  function tarjeta(s) {
    var o = Datos.objetivo(s.objetivo_id) || { titulo: '(objetivo borrado)', icono: 'estrella', color: '#888888' };
    var r = Datos.recuento(s);
    var hora = new Date(s.iniciada_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    var estado;
    if (s.anulada) estado = '<span class="etq gris">Anulada: se repitió</span>';
    else if (!s.cerrada_at) estado = '<span class="etq gris">Sin terminar · no cuenta</span>';
    else if (r.conseguido) estado = '<span class="etq verde">Conseguido · +' + r.puntos + '</span>';
    else estado = '<span class="etq azul">No conseguido</span>';

    var alumnos = alumnosDe(s).map(function (a) {
      var v = s.respuestas[a.id];
      var rev = revisadas[s.id + ':' + a.id] ? '<i class="rev" title="Revisada">✎</i>' : '';
      return '<button class="resp ' + (v || 'nada') + '" data-s="' + s.id + '" data-a="' + a.id + '"' + (s.anulada ? ' disabled' : '') + '>' +
        Avatares.html(a.avatar, 'avatar-mini') +
        '<span class="resp-nombre">' + App.esc(a.nombre_visible) + '</span>' +
        '<span class="resp-valor">' + (v ? ETIQUETA[v] : '—') + '</span>' + rev +
      '</button>';
    }).join('');

    return '<section class="rv-sesion' + (s.anulada ? ' anulada' : '') + '" style="--c:' + o.color + '">' +
      '<header>' + Iconos.html(o.icono, 'ico-mini') +
        '<div><b>' + App.esc(o.titulo) + '</b><small>' + hora + ' · ' + r.si + ' de ' + r.presentes + ' (' + r.pct + ' %) · umbral ' + s.umbral_pct + ' %' +
        (r.ausentes ? ' · ' + r.ausentes + ' no vinieron' : '') + '</small></div>' + estado +
        (!s.cerrada_at && !s.anulada ? '<button class="btn mini-btn" data-cerrar="' + s.id + '">Dar por terminada</button>' : '') +
        '<button class="btn mini-btn borrar-val" data-borrar="' + s.id + '" title="Borrar la valoración entera">🗑 Borrar</button>' +
      '</header>' +
      '<div class="rv-alumnos">' + alumnos + '</div>' +
    '</section>';
  }

  function clic(e) {
    var borrar = e.target.closest('[data-borrar]');
    if (borrar) {
      var id = borrar.getAttribute('data-borrar');
      var s = sesiones.filter(function (x) { return x.id === id; })[0];
      var o = s && Datos.objetivo(s.objetivo_id);
      Dialogo.confirmar('¿Borrar esta valoración?',
        'Se borran las respuestas de todos los alumnos' + (o ? ' de «' + o.titulo + '»' : '') +
        ' y, si sumó puntos al bote, se restan. No se puede deshacer.', 'Borrar', true).then(function (si) {
        if (!si) return;
        Datos.borrarSesion(id);
        sesiones = sesiones.filter(function (x) { return x.id !== id; });
        pintar(false);
        App.aviso('Valoración borrada');
        Datos.actualizarBote().catch(function () {});
      });
      return;
    }
    var cerrar = e.target.closest('[data-cerrar]');
    if (cerrar) {
      Datos.cerrarSesion(cerrar.getAttribute('data-cerrar'));
      refrescar();
      return;
    }
    var b = e.target.closest('.resp');
    if (!b || b.disabled) return;
    Sonido.click();
    var sid = b.getAttribute('data-s'), aid = b.getAttribute('data-a');
    var s = Datos.sesionLocal(sid);
    if (!s) return;
    var nueva = CICLO[s.respuestas[aid]] || 'si';
    Datos.responder(sid, aid, nueva, true);
    revisadas[sid + ':' + aid] = true;
    refrescar();
  }

  function refrescar() {
    sesiones = sesiones.map(function (s) { return Datos.sesionLocal(s.id) || s; });
    pintar(false);
    Datos.actualizarBote().catch(function () {});
  }

  return { abrir: abrir };

})();
