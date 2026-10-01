/* =========================================================
   Puntos individuales (modo maestro)
   Van aparte de los puntos de grupo: el bote es de la clase,
   estos son de cada alumno y se gastan en Premios.
   · Dar puntos: se eligen alumnos (uno o varios) y después la
     conducta, o «Otro motivo» con los puntos a mano.
   · Totales: semana, mes, trimestre y curso de cada alumno.
   · Historial: lo dado, con la opción de quitarlo.
   · Conductas: la lista configurable.
   ========================================================= */
window.Puntos = (function () {

  var $ = function (id) { return document.getElementById(id); };
  var sub = 'dar';
  var elegidos = {};
  var ultimoLote = [];
  var TIPOS = [['positiva', 'Positivas'], ['excepcional', 'Excepcionales'], ['mejorar', 'A mejorar']];

  function avisoEsquema() {
    return '<p class="aviso mal">Falta actualizar la base de datos: ejecuta otra vez <b>supabase/esquema.sql</b> ' +
      'en Supabase (SQL Editor) y recarga la página.</p>';
  }

  function abrir() {
    var p = $('pPuntos');
    p.innerHTML =
      '<div class="panel-cab"><h2>Puntos individuales</h2>' +
        '<div class="segmentos" id="ptSub">' +
          '<button data-s="dar">Dar puntos</button><button data-s="totales">Totales</button>' +
          '<button data-s="historial">Historial</button><button data-s="conductas">Conductas</button>' +
        '</div></div>' +
      '<div id="ptCuerpo"></div>';
    if (Datos.faltaEsquema) { $('ptCuerpo').innerHTML = avisoEsquema(); return; }
    /* los puntos de los «sí» los crea la base de datos: se piden al entrar */
    Datos.refrescarPuntos().then(function (ok) {
      if (ok && $('ptSub') && sub !== 'conductas') ir(sub);
    });
    $('ptSub').onclick = function (e) {
      var b = e.target.closest('[data-s]');
      if (b) { Sonido.click(); ir(b.getAttribute('data-s')); }
    };
    ir(sub);
  }

  function ir(s) {
    sub = s;
    Array.prototype.forEach.call($('ptSub').children, function (b) { b.classList.toggle('on', b.getAttribute('data-s') === s); });
    $('ptCuerpo').classList.toggle('lleno', s === 'dar' || s === 'historial');
    ({ dar: pintarDar, totales: pintarTotales, historial: pintarHistorial, conductas: pintarConductas })[s]();
  }

  function nombre(id) {
    var a = Datos.alumnos.filter(function (x) { return x.id === id; })[0];
    return a ? a.nombre_visible : '(alumno borrado)';
  }
  function conPuntos(n) { return (n > 0 ? '+' : '') + n; }

  /* ======================= DAR PUNTOS =======================
     Dos columnas: a la izquierda el alumnado (se toca a uno o a
     varios); a la derecha, siempre a la vista, «Para: …», las
     conductas y las acciones. Tras dar puntos no se repinta todo:
     solo cambian las insignias, así no parpadea. */
  var ultimoTexto = '';

  function pintarDar() {
    var alumnos = Datos.alumnosActivos();
    var cuerpo = $('ptCuerpo');
    if (!alumnos.length) { cuerpo.innerHTML = '<div class="vacio">Aún no hay alumnado.</div>'; return; }
    var conductas = Datos.conductasActivas();

    cuerpo.innerHTML =
      '<div class="dar">' +
        '<section class="dar-alumnos">' +
          '<div class="dar-cab">' +
            '<span class="dar-paso"><i>1</i> Toca a quién</span>' +
            '<div class="grupo-btn"><button class="chip-claro" id="ptTodos">Toda la clase</button>' +
            '<button class="chip-claro" id="ptNinguno">Ninguno</button></div>' +
          '</div>' +
          '<div class="dar-rejilla" id="ptAlumnos">' + alumnos.map(function (a, i) {
            return '<button class="dar-al" data-id="' + a.id + '" style="--i:' + i + '">' +
              '<span class="dar-check" aria-hidden="true">✓</span>' +
              '<span class="dar-semana" title="Puntos de esta semana"></span>' +
              Avatares.html(a.avatar, 'avatar-dar') +
              '<b>' + App.esc(a.nombre_visible) + '</b>' +
            '</button>';
          }).join('') + '</div>' +
        '</section>' +

        '<aside class="dar-lateral">' +
          '<div class="dar-para" id="ptPara"></div>' +
          '<span class="dar-paso"><i>2</i> Elige por qué</span>' +
          '<div class="dar-conductas" id="ptConductas">' +
            TIPOS.map(function (t) {
              var lista = conductas.filter(function (c) { return c.tipo === t[0]; });
              if (!lista.length) return '';
              return '<p class="dar-grupo">' + t[1] + '</p>' + lista.map(function (c) {
                return '<button class="dar-cond ' + c.tipo + '" data-c="' + c.id + '" style="--c:' + c.color + '">' +
                  Iconos.html(c.icono, 'ico-cond') + '<span>' + App.esc(c.nombre) + '</span>' +
                  '<b class="dar-pts">' + conPuntos(c.puntos) + '</b></button>';
              }).join('');
            }).join('') +
            '<button class="dar-cond otro" data-c="otro">' + Iconos.html('escribir', 'ico-cond') +
              '<span>Otro motivo…</span><b class="dar-pts">±</b></button>' +
          '</div>' +
          '<div class="dar-ultimo" id="ptUltimo"></div>' +
        '</aside>' +
      '</div>';

    refrescarDar();
    Encajar.vigilar('dar', function () {
      var g = $('ptAlumnos');
      if (!g || !document.body.contains(g)) return false;
      Encajar.rejilla(g, { min: 92, max: 176, proporcion: 1.02, hueco: 10 });
      Encajar.filas($('ptConductas'), { fila: '.dar-cond', titulo: '.dar-grupo', min: 32, max: 58, hueco: 6, altoTitulo: 26, columnas: 2 });
    });

    $('ptAlumnos').onclick = function (e) {
      var b = e.target.closest('.dar-al'); if (!b) return;
      Sonido.click();
      var id = b.getAttribute('data-id');
      if (elegidos[id]) delete elegidos[id]; else elegidos[id] = true;
      refrescarDar();
    };
    $('ptTodos').onclick = function () { Sonido.click(); alumnos.forEach(function (a) { elegidos[a.id] = true; }); refrescarDar(); };
    $('ptNinguno').onclick = function () { Sonido.click(); elegidos = {}; refrescarDar(); };
    $('ptConductas').onclick = function (e) {
      var b = e.target.closest('.dar-cond'); if (!b) return;
      if (!Object.keys(elegidos).length) {
        App.aviso('Primero toca a quién se le dan los puntos');
        FX.repetir($('ptAlumnos'), 'tiembla', 400);
        return;
      }
      var id = b.getAttribute('data-c');
      if (id === 'otro') { otroMotivo(); return; }
      var c = Datos.conductas.filter(function (x) { return x.id === id; })[0];
      dar({ conducta_id: c.id, puntos: c.puntos, nota: '' }, c.nombre);
    };
  }

  /* Selección, insignias de la semana, «Para: …» y lo último dado */
  function refrescarDar() {
    if (!$('ptAlumnos')) return;
    var tot = Datos.totales();
    var ids = Object.keys(elegidos);
    Array.prototype.forEach.call($('ptAlumnos').children, function (b) {
      var id = b.getAttribute('data-id'), s = tot[id] ? tot[id].semana : 0;
      b.classList.toggle('elegido', !!elegidos[id]);
      var ins = b.querySelector('.dar-semana');
      ins.textContent = s ? '⭐ ' + s : '';
      ins.classList.toggle('negativo', s < 0);
    });

    var para = $('ptPara');
    if (!ids.length) {
      para.innerHTML = '<span class="dar-para-vacio">Toca uno o varios alumnos de la izquierda</span>';
    } else {
      var al = Datos.alumnos.filter(function (a) { return elegidos[a.id]; });
      var caras = al.slice(0, 5).map(function (a) { return Avatares.html(a.avatar, 'avatar-pila'); }).join('');
      var texto = al.length === Datos.alumnosActivos().length ? 'Toda la clase'
        : al.length <= 2 ? al.map(function (a) { return a.nombre_visible; }).join(' y ')
        : al[0].nombre_visible + ', ' + al[1].nombre_visible + ' y ' + (al.length - 2) + ' más';
      para.innerHTML = '<div class="pila">' + caras + '</div><div class="dar-para-texto"><small>Para</small><b>' + App.esc(texto) + '</b></div>';
    }
    $('ptConductas').classList.toggle('en-espera', !ids.length);

    $('ptUltimo').innerHTML = ultimoLote.length
      ? '<span>' + App.esc(ultimoTexto) + '</span><button class="chip-claro" id="ptDeshacer">↶ Deshacer</button>'
      : '';
    if ($('ptDeshacer')) $('ptDeshacer').onclick = deshacerLote;
  }

  function dar(motivo, texto) {
    var ids = Object.keys(elegidos);
    var tarjetas = ids.map(function (id) { return document.querySelector('.dar-al[data-id="' + id + '"]'); });
    Datos.darPuntos(ids, motivo).then(function (nuevos) {
      ultimoLote = nuevos.map(function (x) { return x.id; });
      ultimoTexto = conPuntos(motivo.puntos) + ' · ' + texto + ' → ' + (ids.length === 1 ? nombre(ids[0]) : ids.length + ' alumnos');
      if (motivo.puntos > 0) Sonido.si(); else Sonido.click();
      tarjetas.forEach(function (t) {
        if (!t) return;
        FX.flotante(t, conPuntos(motivo.puntos), motivo.puntos > 0 ? '#1FA35A' : '#6F7896');
        if (motivo.puntos > 0 && App.animar()) FX.repetir(t, 'recibe', 600);
      });
      if (motivo.puntos > 0 && App.animar()) tarjetas.slice(0, 6).forEach(function (t) { if (t) FX.desde(t, 8); });
      elegidos = {};
      refrescarDar();
    }, function (e) { App.aviso(e.message, 'mal'); });
  }

  function otroMotivo() {
    Ficha.abrir({
      titulo: 'Otro motivo',
      valores: { nota: '', puntos: 1 },
      campos: [
        { id: 'nota', etiqueta: 'Motivo', tipo: 'texto', largo: 120, obligatorio: true, pista: 'p. ej. Ha organizado el rincón de lectura' },
        { id: 'puntos', etiqueta: 'Puntos (negativos para restar)', tipo: 'numero', min: -50, max: 100 }
      ],
      comprobar: function (v) { return v.puntos === 0 ? 'Los puntos no pueden ser 0.' : ''; },
      guardar: function (v) { dar({ conducta_id: null, puntos: v.puntos, nota: v.nota }, v.nota); return Promise.resolve(); }
    });
  }

  function deshacerLote() {
    if (!ultimoLote.length) return;
    Sonido.click();
    var lote = ultimoLote; ultimoLote = [];
    Promise.all(lote.map(Datos.borrarPunto)).then(function () { App.aviso('Deshecho'); refrescarDar(); },
      function (e) { App.aviso(e.message, 'mal'); refrescarDar(); });
  }

  /* ======================= TOTALES =======================
     Dos vistas, con un interruptor en la propia pantalla:
     · Tarjetas (como «Dar puntos»): cada alumno con sus cifras debajo,
       todo encajado sin desplazar.
     · Tabla: la de siempre, para comparar de un vistazo.
     La elegida se recuerda en este ordenador. */
  var K_VISTA = 'classmojo.totales.vista';
  function fechaCorta(iso) { var p = iso.split('-'); return +p[2] + '/' + +p[1]; }
  function vistaTotales(v) {
    try { if (v) localStorage.setItem(K_VISTA, v); return localStorage.getItem(K_VISTA) || 'tarjetas'; } catch (e) { return v || 'tarjetas'; }
  }

  function pintarTotales() {
    var t = Datos.totales(), p = Datos.periodos(), vista = vistaTotales();
    var cab = '<div class="dar-cab">' +
        '<span class="tenue">Semana desde el ' + fechaCorta(p.semana) + ' · mes desde el ' + fechaCorta(p.mes) +
          ' · trimestre desde el ' + fechaCorta(p.trimestre) + ' · saldo = ganado − canjeado</span>' +
        '<div class="segmentos" id="ptVista"><button data-v="tarjetas"' + (vista === 'tarjetas' ? ' class="on"' : '') + '>▦ Tarjetas</button>' +
          '<button data-v="tabla"' + (vista === 'tabla' ? ' class="on"' : '') + '>☰ Tabla</button></div>' +
      '</div>';
    $('ptCuerpo').classList.toggle('lleno', vista === 'tarjetas');

    if (vista === 'tabla') {
      var filas = Datos.alumnos.map(function (a) {
        var o = t[a.id];
        return '<tr' + (a.activo ? '' : ' class="inactivo"') + '><td class="al-celda">' + Avatares.html(a.avatar, 'avatar-mini') + App.esc(a.nombre_visible) + '</td>' +
          '<td><b>' + o.total + '</b></td><td>' + o.semana + '</td><td>' + o.mes + '</td><td>' + o.trimestre + '</td>' +
          '<td class="tenue">' + (o.gastado ? '−' + o.gastado : '0') + '</td><td><b>' + o.saldo + '</b></td></tr>';
      }).join('');
      $('ptCuerpo').innerHTML = cab + '<div class="tabla-caja"><table class="tabla">' +
        '<thead><tr><th>Alumno</th><th>Total</th><th>Semana</th><th>Mes</th><th>Trimestre</th><th>Canjeado</th><th>Saldo</th></tr></thead>' +
        '<tbody>' + filas + '</tbody></table></div>';
    } else {
      $('ptCuerpo').innerHTML = '<div class="tot">' + cab +
        '<div class="dar-rejilla tot-rejilla" id="ptTot">' + Datos.alumnosActivos().map(function (a) {
          var o = t[a.id];
          return '<div class="dar-al tot-al">' +
            Avatares.html(a.avatar, 'avatar-dar') +
            '<b>' + App.esc(a.nombre_visible) + '</b>' +
            '<span class="tot-grande">⭐ ' + o.total + '</span>' +
            '<span class="tot-cifras">' +
              '<i><em>' + o.semana + '</em>sem.</i><i><em>' + o.mes + '</em>mes</i>' +
              '<i><em>' + o.trimestre + '</em>trim.</i><i class="saldo"><em>' + o.saldo + '</em>saldo</i>' +
            '</span>' +
          '</div>';
        }).join('') + '</div></div>';
      Encajar.vigilar('totales', function () {
        var g = $('ptTot');
        if (!g || !document.body.contains(g)) return false;
        Encajar.rejilla(g, { min: 110, max: 190, proporcion: 1.32, hueco: 10 });
      });
    }
    $('ptVista').onclick = function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return;
      Sonido.click();
      vistaTotales(b.getAttribute('data-v'));
      pintarTotales();
    };
  }

  /* ======================= HISTORIAL =======================
     Como «Dar puntos»: a la izquierda el alumnado con su resumen; a la
     derecha, lo último de toda la clase o, al tocar un alumno, todo lo
     suyo. En la derecha se puede quitar un apunte, elegir varios y
     quitarlos de una vez, o reiniciar los puntos (del alumno o de toda
     la clase). */
  var histAlumno = null;
  var seleccion = null;   // null = sin elegir; {id: true} mientras se eligen apuntes

  function motivoHTML(x, cond) {
    var c = x.conducta_id && cond[x.conducta_id];
    return c ? Iconos.html(c.icono, 'ico-mini2') + '<span>' + App.esc(c.nombre) + '</span>'
      : x.autoevaluacion_id ? Iconos.html('check', 'ico-mini2') + '<span>' + App.esc(x.nota || 'Autoevaluación') + '</span>'
      : '<span class="ico-mini2 ico-texto">✏️</span><span>' + App.esc(x.nota || 'Otro motivo') + '</span>';
  }

  function pintarHistorial() {
    $('ptCuerpo').classList.add('lleno');
    if (histAlumno && !Datos.alumnos.some(function (a) { return a.id === histAlumno; })) histAlumno = null;
    var t = Datos.totales(), cuantos = {};
    Datos.puntos.forEach(function (x) { cuantos[x.alumno_id] = (cuantos[x.alumno_id] || 0) + 1; });
    $('ptCuerpo').innerHTML =
      '<div class="dar">' +
        '<section class="dar-alumnos">' +
          '<div class="dar-cab"><span class="dar-paso"><i>1</i> Toca a un alumno para ver su detalle</span>' +
            '<button class="chip-claro" id="ptHistTodos">Toda la clase</button></div>' +
          '<div class="dar-rejilla" id="ptHistAl">' + Datos.alumnosActivos().map(function (a) {
            return '<button class="dar-al" data-id="' + a.id + '">' +
              '<span class="dar-check" aria-hidden="true">✓</span>' +
              '<span class="dar-semana' + (t[a.id].total < 0 ? ' negativo' : '') + '">⭐ ' + t[a.id].total + '</span>' +
              Avatares.html(a.avatar, 'avatar-dar') +
              '<b>' + App.esc(a.nombre_visible) + '</b>' +
              '<small class="hist-cuenta">' + (cuantos[a.id] || 0) + ((cuantos[a.id] || 0) === 1 ? ' apunte' : ' apuntes') + '</small>' +
            '</button>';
          }).join('') + '</div>' +
        '</section>' +
        '<aside class="dar-lateral">' +
          '<div class="dar-para" id="ptHistPara"></div>' +
          '<div class="hist-barra" id="ptHistBarra"></div>' +
          '<div class="hist-lista" id="ptHistLista"></div>' +
        '</aside>' +
      '</div>';

    $('ptHistAl').onclick = function (e) {
      var b = e.target.closest('.dar-al'); if (!b) return;
      Sonido.click();
      var id = b.getAttribute('data-id');
      histAlumno = histAlumno === id ? null : id;
      seleccion = null;
      pintarDetalle();
    };
    $('ptHistTodos').onclick = function () { Sonido.click(); histAlumno = null; seleccion = null; pintarDetalle(); };
    $('ptHistBarra').onclick = function (e) {
      var b = e.target.closest('[data-acc]'); if (!b || b.disabled) return;
      var acc = b.getAttribute('data-acc');
      Sonido.click();
      if (acc === 'elegir') { seleccion = {}; pintarDetalle(); }
      else if (acc === 'cancelar') { seleccion = null; pintarDetalle(); }
      else if (acc === 'todos') {
        var ids = idsVisibles(), todos = ids.every(function (id) { return seleccion[id]; });
        seleccion = {};
        if (!todos) ids.forEach(function (id) { seleccion[id] = true; });
        marcarSeleccion();
      }
      else if (acc === 'borrar') borrarSeleccion();
      else if (acc === 'reiniciar') reiniciar();
    };
    $('ptHistLista').onclick = function (e) {
      if (seleccion) {
        var item = e.target.closest('.hist-item[data-id]'); if (!item) return;
        var id = item.getAttribute('data-id');
        if (seleccion[id]) delete seleccion[id]; else seleccion[id] = true;
        marcarSeleccion();
        return;
      }
      var b = e.target.closest('[data-borrar]'); if (!b) return;
      Dialogo.confirmar('¿Quitar estos puntos?', 'Se restan de su total y de su saldo.', 'Quitar').then(function (si) {
        if (si) Datos.borrarPunto(b.getAttribute('data-borrar')).then(pintarHistorial, function (er) { App.aviso(er.message, 'mal'); });
      });
    };
    pintarDetalle();
    Encajar.vigilar('historial', function () {
      var g = $('ptHistAl');
      if (!g || !document.body.contains(g)) return false;
      Encajar.rejilla(g, { min: 92, max: 176, proporcion: 1.1, hueco: 10 });
    });
  }

  /* lo que se ve a la derecha: todo lo del alumno o lo último de la clase */
  function apuntesVisibles() {
    var todos = Datos.puntos.slice().sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
    return histAlumno ? todos.filter(function (x) { return x.alumno_id === histAlumno; }) : todos.slice(0, 100);
  }
  function idsVisibles() { return apuntesVisibles().map(function (x) { return x.id; }); }

  function pintarDetalle() {
    if (!$('ptHistLista')) return;
    Array.prototype.forEach.call($('ptHistAl').children, function (b) { b.classList.toggle('elegido', b.getAttribute('data-id') === histAlumno); });
    var cond = {};
    Datos.conductas.forEach(function (c) { cond[c.id] = c; });
    var lista = apuntesVisibles(), para;
    if (histAlumno) {
      var a = Datos.alumnos.filter(function (x) { return x.id === histAlumno; })[0];
      var o = Datos.totales()[histAlumno];
      para = '<div class="pila">' + Avatares.html(a.avatar, 'avatar-pila') + '</div><div class="dar-para-texto"><small>Historial de</small><b>' +
        App.esc(a.nombre_visible) + '</b></div><div class="hist-resumen"><b>⭐ ' + o.total + '</b><span>sem. ' + o.semana + ' · mes ' + o.mes +
        ' · trim. ' + o.trimestre + ' · saldo ' + o.saldo + '</span></div>';
    } else {
      para = '<div class="dar-para-texto"><small>Toda la clase</small><b>Lo último que se ha dado</b></div>';
    }
    $('ptHistPara').innerHTML = para;
    $('ptHistLista').classList.toggle('eligiendo', !!seleccion);
    $('ptHistLista').innerHTML = lista.length ? lista.map(function (x) {
      return '<div class="hist-item" data-id="' + x.id + '">' +
        '<span class="hist-fecha">' + fechaCorta(x.fecha) + '</span>' +
        '<span class="hist-motivo">' + (histAlumno ? '' : '<b>' + App.esc(nombre(x.alumno_id)) + '</b>') + motivoHTML(x, cond) + '</span>' +
        '<span class="dar-pts' + (x.puntos < 0 ? ' menos' : '') + '">' + conPuntos(x.puntos) + '</span>' +
        (seleccion
          ? '<span class="hist-check" aria-hidden="true">✓</span>'
          : '<button class="mini peligro-suave" data-borrar="' + x.id + '" title="Quitar">🗑</button>') +
      '</div>';
    }).join('') : '<div class="vacio">' + (histAlumno ? 'Aún no tiene puntos.' : 'Todavía no se han dado puntos.') + '</div>';
    marcarSeleccion();
  }

  /* Botones de la derecha y apuntes marcados. Al marcar o desmarcar se
     repinta solo esto, para no perder por dónde iba la lista. */
  function marcarSeleccion() {
    var barra = $('ptHistBarra'); if (!barra) return;
    var hay = idsVisibles().length;
    if (!seleccion) {
      var algo = histAlumno
        ? Datos.puntos.some(function (x) { return x.alumno_id === histAlumno; }) ||
          Datos.canjes.some(function (c) { return c.alumno_id === histAlumno; })
        : Datos.puntos.length > 0 || Datos.canjes.some(function (c) { return c.alumno_id; });
      barra.innerHTML =
        '<button class="chip-claro" data-acc="elegir"' + (hay ? '' : ' disabled') + '>☑ Elegir varios</button>' +
        '<button class="chip-claro peligro" data-acc="reiniciar"' + (algo ? '' : ' disabled') + '>↺ ' +
          (histAlumno ? 'Reiniciar sus puntos' : 'Reiniciar toda la clase') + '</button>';
      return;
    }
    var n = Object.keys(seleccion).length;
    barra.innerHTML =
      '<button class="chip-claro" data-acc="todos">' + (n && n === hay ? 'Ninguno' : 'Todos') + '</button>' +
      '<button class="chip-claro peligro" data-acc="borrar"' + (n ? '' : ' disabled') + '>🗑 Quitar' + (n ? ' ' + n : '') + '</button>' +
      '<button class="chip-claro" data-acc="cancelar">Cancelar</button>';
    Array.prototype.forEach.call($('ptHistLista').querySelectorAll('.hist-item[data-id]'), function (el) {
      el.classList.toggle('marcado', !!seleccion[el.getAttribute('data-id')]);
    });
  }

  function borrarSeleccion() {
    var ids = Object.keys(seleccion);
    if (!ids.length) return;
    var suma = Datos.puntos.reduce(function (s, x) { return seleccion[x.id] ? s + x.puntos : s; }, 0);
    Dialogo.confirmar('¿Quitar ' + ids.length + (ids.length === 1 ? ' apunte?' : ' apuntes?'),
      'Suman ' + conPuntos(suma) + ' puntos. Se restan de los totales y de los saldos. No se puede deshacer.', 'Quitar', true)
      .then(function (si) {
        if (!si) return;
        App.cargando(true, 'Quitando…');
        return Datos.borrarPuntos(ids).then(function () {
          App.cargando(false);
          seleccion = null;
          App.aviso(ids.length === 1 ? 'Apunte quitado' : ids.length + ' apuntes quitados');
          pintarHistorial();
        });
      })
      .catch(function (er) { App.cargando(false); App.aviso(er.message, 'mal'); });
  }

  /* Reiniciar: borra los apuntes y los canjes individuales (si no, el saldo
     quedaría en negativo). Para toda la clase hay que escribir REINICIAR. */
  function reiniciar() {
    var alumno = histAlumno, pregunta;
    if (alumno) {
      var a = Datos.alumnos.filter(function (x) { return x.id === alumno; })[0];
      pregunta = Dialogo.confirmar('¿Reiniciar los puntos de ' + a.nombre_visible + '?',
        'Se borran todos sus apuntes y los premios que ha canjeado: su total y su saldo vuelven a 0. ' +
        'El bote de la clase no cambia. No se puede deshacer.', 'Reiniciar', true);
    } else {
      pregunta = Dialogo.pedir({
        titulo: '¿Reiniciar los puntos de toda la clase?',
        texto: 'Se borran todos los apuntes de puntos individuales y los premios individuales canjeados de todo el alumnado: ' +
               'los totales y los saldos vuelven a 0. El bote de la clase y sus premios colectivos no cambian. ' +
               'No se puede deshacer; si quieres guardar una copia, antes usa Ajustes → Exportar los datos. ' +
               'Para confirmar, escribe REINICIAR.',
        campo: true, pista: 'REINICIAR', aceptar: 'Reiniciar', peligro: true,
        comprobar: function (v) { return v.trim().toUpperCase() === 'REINICIAR' ? '' : 'Escribe REINICIAR para confirmar.'; }
      }).then(function (v) { return v !== null; });
    }
    pregunta.then(function (si) {
      if (!si) return;
      App.cargando(true, 'Reiniciando…');
      return Datos.reiniciarPuntos(alumno).then(function () {
        App.cargando(false);
        App.aviso(alumno ? 'Puntos reiniciados' : 'Puntos de la clase reiniciados');
        pintarHistorial();
      });
    }).catch(function (er) { App.cargando(false); App.aviso(er.message, 'mal'); pintarHistorial(); });
  }

  /* ======================= CONDUCTAS ======================= */
  function pintarConductas() {
    var l = Datos.conductas;
    $('ptCuerpo').innerHTML =
      '<div class="barra-dar"><span class="tenue">Cambiar los puntos de una conducta no altera los ya dados.</span>' +
      '<button class="btn principal" id="ptNueva">➕ Nueva conducta</button></div>' +
      '<div class="lista-ob" id="ptCond">' + l.map(function (c, i) {
        return '<div class="fila-ob' + (c.activa ? '' : ' inactivo') + '" data-id="' + c.id + '" style="--c:' + c.color + '">' +
          '<span class="flechas"><button class="mini" data-acc="subir"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
          '<button class="mini" data-acc="bajar"' + (i === l.length - 1 ? ' disabled' : '') + '>▼</button></span>' +
          Iconos.html(c.icono, 'ico-fila') +
          '<div class="ob-texto"><b>' + App.esc(c.nombre) + '</b><small>' + ({ positiva: 'Positiva', excepcional: 'Excepcional', mejorar: 'A mejorar' })[c.tipo] + '</small></div>' +
          '<span class="etq ' + (c.puntos > 0 ? 'verde' : 'gris') + '">' + conPuntos(c.puntos) + '</span>' +
          '<label class="interruptor"><input type="checkbox" data-acc="activa"' + (c.activa ? ' checked' : '') + '><i></i><span>Activa</span></label>' +
          '<button class="mini" data-acc="editar">✏️</button></div>';
      }).join('') + '</div>';
    Encajar.vigilar('conductas', function () { return Encajar.columnas($('ptCond'), { ancho: 520, anchoMin: 420, max: 2 }); });
    $('ptNueva').onclick = function () { editarConducta(null); };
    var cont = $('ptCond');
    cont.onclick = function (e) {
      var b = e.target.closest('[data-acc]'); if (!b || b.tagName === 'INPUT') return;
      var c = Datos.conductas.filter(function (x) { return x.id === b.closest('.fila-ob').getAttribute('data-id'); })[0];
      var acc = b.getAttribute('data-acc');
      if (acc === 'editar') return editarConducta(c);
      var i = l.indexOf(c), j = i + (acc === 'subir' ? -1 : 1);
      if (j < 0 || j >= l.length) return;
      l.splice(i, 1); l.splice(j, 0, c);
      pintarConductas();
      Datos.reordenar('conductas', l).catch(function (er) { App.aviso(er.message, 'mal'); });
    };
    cont.onchange = function (e) {
      if (e.target.getAttribute('data-acc') !== 'activa') return;
      var id = e.target.closest('.fila-ob').getAttribute('data-id');
      Datos.guardarEn('conductas', id, { activa: e.target.checked }).then(pintarConductas, function (er) { App.aviso(er.message, 'mal'); });
    };
  }

  function editarConducta(c) {
    Ficha.abrir({
      titulo: c ? 'Editar conducta' : 'Nueva conducta',
      valores: c || { nombre: '', puntos: 2, tipo: 'positiva', icono: 'estrella', color: '#22A45D' },
      campos: [
        { id: 'nombre', etiqueta: 'Conducta', tipo: 'texto', obligatorio: true, pista: 'p. ej. Explica a un compañero cómo lo ha hecho' },
        { id: 'puntos', etiqueta: 'Puntos (negativos para restar)', tipo: 'numero', min: -50, max: 100 },
        { id: 'tipo', etiqueta: 'Tipo', tipo: 'opciones', opciones: [['positiva', 'Positiva'], ['excepcional', 'Excepcional'], ['mejorar', 'A mejorar']] },
        { id: 'color', etiqueta: 'Color', tipo: 'color' },
        { id: 'icono', etiqueta: 'Icono', tipo: 'icono' }
      ],
      comprobar: function (v) {
        if (v.puntos === 0) return 'Los puntos no pueden ser 0.';
        if (v.tipo === 'mejorar' && v.puntos > 0) return 'Una conducta «a mejorar» tiene que restar (puntos negativos).';
        if (v.tipo !== 'mejorar' && v.puntos < 0) return 'Si resta puntos, el tipo es «A mejorar».';
        return '';
      },
      borrar: c ? function () { return Datos.borrarConducta(c).then(pintarConductas); } : null,
      textoBorrar: 'Los puntos ya dados con ella se conservan y en el historial siguen apareciendo con su nombre. Si solo quieres dejar de usarla, desactívala.',
      guardar: function (v) {
        var campos = { nombre: v.nombre, puntos: v.puntos, tipo: v.tipo, icono: v.icono, color: v.color };
        if (!c) campos.orden = Datos.conductas.reduce(function (m, x) { return Math.max(m, x.orden); }, 0) + 1;
        return Datos.guardarEn('conductas', c ? c.id : null, campos).then(pintarConductas);
      }
    });
  }

  return { abrir: abrir };

})();
