/* =========================================================
   Premios (modo maestro)
   · Canjear: se elige quién (un alumno o «la clase») y el premio.
     Los individuales se pagan con el saldo del alumno; los
     colectivos, con el bote. Sin saldo no se puede (lo comprueba
     también la base de datos).
   · Catálogo: premios con nivel 1, 2, 3 o colectivo y su precio.
   · Canjes hechos, con la opción de deshacerlos.
   ========================================================= */
window.Premios = (function () {

  var $ = function (id) { return document.getElementById(id); };
  var sub = 'canjear';
  var quien = null;          // id del alumno, 'clase' o null
  var NIVELES = [['1', 'Nivel 1'], ['2', 'Nivel 2'], ['3', 'Nivel 3'], ['colectiva', 'Colectivo (bote)']];

  function abrir() {
    quien = null;
    $('pPremios').innerHTML =
      '<div class="panel-cab"><h2>Premios</h2>' +
        '<div class="segmentos" id="prSub">' +
          '<button data-s="canjear">Canjear</button><button data-s="catalogo">Catálogo</button><button data-s="hechos">Canjes hechos</button>' +
        '</div></div>' +
      '<div id="prCuerpo"></div>';
    if (Datos.faltaEsquema) {
      $('prCuerpo').innerHTML = '<p class="aviso mal">Falta actualizar la base de datos: ejecuta otra vez <b>supabase/esquema.sql</b> en Supabase y recarga la página.</p>';
      return;
    }
    $('prSub').onclick = function (e) {
      var b = e.target.closest('[data-s]');
      if (b) { Sonido.click(); ir(b.getAttribute('data-s')); }
    };
    Promise.all([Datos.actualizarBote().catch(function () {}), Datos.refrescarPuntos()])
      .then(function () { if (sub === 'canjear') refrescarCanjear(); });
    ir(sub);
  }

  function ir(s) {
    sub = s;
    Array.prototype.forEach.call($('prSub').children, function (b) { b.classList.toggle('on', b.getAttribute('data-s') === s); });
    $('prCuerpo').classList.toggle('lleno', s === 'canjear');
    ({ canjear: pintarCanjear, catalogo: pintarCatalogo, hechos: pintarHechos })[s]();
  }

  function nombre(id) {
    if (!id) return '🏫 La clase';
    var a = Datos.alumnos.filter(function (x) { return x.id === id; })[0];
    return a ? a.nombre_visible : '(alumno borrado)';
  }

  /* ======================= CANJEAR =======================
     Igual que «Dar puntos»: a la izquierda quién (la clase o un
     alumno), a la derecha sus premios con el precio. Todo cabe en
     la pantalla sin desplazar. */
  var GRUPOS = [['1', 'Nivel 1'], ['2', 'Nivel 2'], ['3', 'Nivel 3']];

  function pintarCanjear() {
    var alumnos = Datos.alumnosActivos();
    $('prCuerpo').innerHTML =
      '<div class="dar">' +
        '<section class="dar-alumnos">' +
          '<div class="dar-cab"><span class="dar-paso"><i>1</i> ¿Quién canjea?</span></div>' +
          '<div class="dar-rejilla" id="prQuien">' +
            '<button class="dar-al clase" data-q="clase">' +
              '<span class="dar-check" aria-hidden="true">✓</span>' +
              '<span class="dar-semana saldo" data-saldo="clase"></span>' +
              Iconos.html('bote', 'avatar-dar') + '<b>La clase</b></button>' +
            alumnos.map(function (a) {
              return '<button class="dar-al" data-q="' + a.id + '">' +
                '<span class="dar-check" aria-hidden="true">✓</span>' +
                '<span class="dar-semana saldo" data-saldo="' + a.id + '"></span>' +
                Avatares.html(a.avatar, 'avatar-dar') + '<b>' + App.esc(a.nombre_visible) + '</b></button>';
            }).join('') +
          '</div>' +
        '</section>' +
        '<aside class="dar-lateral">' +
          '<div class="dar-para" id="prPara"></div>' +
          '<span class="dar-paso"><i>2</i> Elige el premio</span>' +
          '<div class="dar-conductas" id="prLista"></div>' +
          '<div class="dar-ultimo" id="prUltimo"></div>' +
        '</aside>' +
      '</div>';

    $('prQuien').onclick = function (e) {
      var b = e.target.closest('[data-q]'); if (!b) return;
      Sonido.click();
      var q = b.getAttribute('data-q');
      quien = quien === q ? null : q;
      refrescarCanjear();
    };
    $('prLista').onclick = function (e) {
      var b = e.target.closest('[data-r]'); if (!b) return;
      if (!quien) { App.aviso('Primero toca quién canjea'); FX.repetir($('prQuien'), 'tiembla', 400); return; }
      if (b.classList.contains('no-llega')) { App.aviso('No tiene puntos suficientes'); return; }
      canjearPremio(b.getAttribute('data-r'));
    };
    refrescarCanjear();
    Encajar.vigilar('canjear', function () {
      var g = $('prQuien');
      if (!g || !document.body.contains(g)) return false;
      Encajar.rejilla(g, { min: 92, max: 176, proporcion: 1.02, hueco: 10 });
      encajarLista();
    });
  }

  function encajarLista() {
    var l = $('prLista');
    if (l) Encajar.filas(l, { fila: '.dar-cond', titulo: '.dar-grupo', min: 32, max: 58, hueco: 6, altoTitulo: 26, columnas: 2 });
  }

  function saldoDe(q, tot) { return q === 'clase' ? Datos.bote.total : tot[q] ? tot[q].saldo : 0; }

  function refrescarCanjear() {
    if (!$('prQuien')) return;
    var tot = Datos.totales();
    Array.prototype.forEach.call($('prQuien').children, function (b) {
      var q = b.getAttribute('data-q'), s = saldoDe(q, tot);
      b.classList.toggle('elegido', quien === q);
      var ins = b.querySelector('.dar-semana');
      ins.textContent = (q === 'clase' ? '🫙 ' : '⭐ ') + s;
      ins.classList.toggle('negativo', s <= 0);
    });

    var para = $('prPara');
    if (!quien) {
      para.innerHTML = '<span class="dar-para-vacio">Toca a la clase o a un alumno de la izquierda</span>';
    } else {
      var saldo = saldoDe(quien, tot);
      var cara = quien === 'clase' ? Iconos.html('bote', 'avatar-pila')
        : Avatares.html((Datos.alumnos.filter(function (a) { return a.id === quien; })[0] || {}).avatar, 'avatar-pila');
      para.innerHTML = '<div class="pila">' + cara + '</div><div class="dar-para-texto"><small>' +
        (quien === 'clase' ? 'La clase paga con el bote' : 'Canjea') + '</small><b>' +
        App.esc(quien === 'clase' ? 'La clase' : nombre(quien)) + ' · ' + saldo + ' puntos</b></div>';
    }

    /* premios: los colectivos para la clase; los individuales, por niveles */
    var saldoActual = quien ? saldoDe(quien, tot) : null;
    var activos = Datos.recompensas.filter(function (r) { return r.activa; });
    var grupos = quien === 'clase' ? [['colectiva', 'Colectivos']] : GRUPOS;
    var html = grupos.map(function (g) {
      var lista = activos.filter(function (r) { return r.nivel === g[0]; });
      if (!lista.length) return '';
      return '<p class="dar-grupo">' + g[1] + '</p>' + lista.map(function (r) {
        var falta = saldoActual === null ? 0 : r.precio - saldoActual;
        return '<button class="dar-cond premio' + (falta > 0 ? ' no-llega' : '') + '" data-r="' + r.id + '" style="--c:' + r.color + '">' +
          Iconos.html(r.icono, 'ico-cond') +
          '<span>' + App.esc(r.nombre) + (falta > 0 ? '<small>faltan ' + falta + '</small>' : '') + '</span>' +
          '<b class="dar-pts">' + r.precio + '</b></button>';
      }).join('');
    }).join('');
    $('prLista').innerHTML = html || '<div class="vacio">No hay premios activos de este tipo. Créalos en «Catálogo».</div>';
    $('prLista').classList.toggle('en-espera', !quien);
    encajarLista();
  }

  function canjearPremio(id) {
    var r = Datos.recompensas.filter(function (x) { return x.id === id; })[0];
    var para = quien === 'clase' ? null : quien;
    var saldo = saldoDe(quien, Datos.totales());
    Dialogo.confirmar('¿Canjear «' + r.nombre + '»?',
      nombre(para) + ' paga ' + r.precio + ' puntos y le quedan ' + (saldo - r.precio) + '.', 'Canjear').then(function (si) {
      if (!si) return;
      Datos.canjear(para, r.id).then(function () {
        Sonido.fiesta(3000);
        if (App.animar()) FX.lluvia(90);
        var ult = $('prUltimo');
        if (ult) ult.innerHTML = '<span>🎁 ' + App.esc(r.nombre) + ' → ' + App.esc(nombre(para)) + '</span>';
        return Datos.actualizarBote().catch(function () {});
      }).then(refrescarCanjear, function (er) { App.aviso(er.message, 'mal'); refrescarCanjear(); });
    });
  }

  function etiquetaNivel(n) { return n === 'colectiva' ? 'Colectivo' : 'Nivel ' + n; }

  /* ======================= CATÁLOGO ======================= */
  function pintarCatalogo() {
    var l = Datos.recompensas;
    $('prCuerpo').innerHTML =
      '<div class="barra-dar"><span class="tenue">Cambiar el precio no altera los canjes ya hechos.</span>' +
      '<button class="btn principal" id="prNuevo">➕ Nuevo premio</button></div>' +
      '<div class="lista-ob" id="prCat">' + l.map(function (r, i) {
        return '<div class="fila-ob' + (r.activa ? '' : ' inactivo') + '" data-id="' + r.id + '" style="--c:' + r.color + '">' +
          '<span class="flechas"><button class="mini" data-acc="subir"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
          '<button class="mini" data-acc="bajar"' + (i === l.length - 1 ? ' disabled' : '') + '>▼</button></span>' +
          Iconos.html(r.icono, 'ico-fila') +
          '<div class="ob-texto"><b>' + App.esc(r.nombre) + '</b><small>' + etiquetaNivel(r.nivel) + '</small></div>' +
          '<span class="etq">' + r.precio + ' puntos</span>' +
          '<label class="interruptor"><input type="checkbox" data-acc="activa"' + (r.activa ? ' checked' : '') + '><i></i><span>Activo</span></label>' +
          '<button class="mini" data-acc="editar">✏️</button></div>';
      }).join('') + '</div>';
    Encajar.vigilar('catalogo', function () { return Encajar.columnas($('prCat'), { ancho: 520, anchoMin: 420, max: 2 }); });
    $('prNuevo').onclick = function () { editar(null); };
    var cont = $('prCat');
    cont.onclick = function (e) {
      var b = e.target.closest('[data-acc]'); if (!b || b.tagName === 'INPUT') return;
      var r = l.filter(function (x) { return x.id === b.closest('.fila-ob').getAttribute('data-id'); })[0];
      var acc = b.getAttribute('data-acc');
      if (acc === 'editar') return editar(r);
      var i = l.indexOf(r), j = i + (acc === 'subir' ? -1 : 1);
      if (j < 0 || j >= l.length) return;
      l.splice(i, 1); l.splice(j, 0, r);
      pintarCatalogo();
      Datos.reordenar('recompensas', l).catch(function (er) { App.aviso(er.message, 'mal'); });
    };
    cont.onchange = function (e) {
      if (e.target.getAttribute('data-acc') !== 'activa') return;
      Datos.guardarEn('recompensas', e.target.closest('.fila-ob').getAttribute('data-id'), { activa: e.target.checked })
        .then(pintarCatalogo, function (er) { App.aviso(er.message, 'mal'); });
    };
  }

  function editar(r) {
    Ficha.abrir({
      titulo: r ? 'Editar premio' : 'Nuevo premio',
      valores: r || { nombre: '', nivel: '1', precio: 15, icono: 'trofeo', color: '#F59E0B' },
      campos: [
        { id: 'nombre', etiqueta: 'Premio', tipo: 'texto', obligatorio: true, pista: 'p. ej. Elegir la música de plástica' },
        { id: 'nivel', etiqueta: 'Nivel', tipo: 'opciones', opciones: NIVELES },
        { id: 'precio', etiqueta: 'Precio en puntos', tipo: 'numero', min: 1, max: 1000 },
        { id: 'color', etiqueta: 'Color', tipo: 'color' },
        { id: 'icono', etiqueta: 'Icono', tipo: 'icono' }
      ],
      borrar: r ? function () { return Datos.borrarDe('recompensas', r.id).then(pintarCatalogo); } : null,
      textoBorrar: 'Los canjes ya hechos se conservan. Si solo quieres quitarlo del catálogo, desactívalo.',
      guardar: function (v) {
        var campos = { nombre: v.nombre, nivel: v.nivel, precio: v.precio, icono: v.icono, color: v.color };
        if (!r) campos.orden = Datos.recompensas.reduce(function (m, x) { return Math.max(m, x.orden); }, 0) + 1;
        return Datos.guardarEn('recompensas', r ? r.id : null, campos).then(pintarCatalogo);
      }
    });
  }

  /* ======================= CANJES HECHOS ======================= */
  function pintarHechos() {
    var lista = Datos.canjes.slice().sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }).slice(0, 200);
    if (!lista.length) { $('prCuerpo').innerHTML = '<div class="vacio">Todavía no se ha canjeado nada.</div>'; return; }
    $('prCuerpo').innerHTML = '<div class="lista-hist" id="prHechos">' + lista.map(function (c) {
      var p = c.fecha.split('-');
      return '<div class="fila-hist">' +
        '<span class="tenue">' + +p[2] + '/' + +p[1] + '</span>' +
        '<b>' + App.esc(nombre(c.alumno_id)) + '</b>' +
        '<span class="hist-motivo">🎁 ' + App.esc(c.nombre) + '</span>' +
        '<span class="etq">−' + c.precio + '</span>' +
        '<button class="btn mini-btn" data-id="' + c.id + '">↶ Deshacer</button>' +
      '</div>';
    }).join('') + '</div>';
    $('prHechos').onclick = function (e) {
      var b = e.target.closest('[data-id]'); if (!b) return;
      Dialogo.confirmar('¿Deshacer el canje?', 'Se devuelven los puntos.', 'Deshacer').then(function (si) {
        if (!si) return;
        Datos.deshacerCanje(b.getAttribute('data-id'))
          .then(function () { return Datos.actualizarBote().catch(function () {}); })
          .then(pintarHechos, function (er) { App.aviso(er.message, 'mal'); });
      });
    };
  }

  return { abrir: abrir };

})();
