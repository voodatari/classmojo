/* =========================================================
   Alumnado (modo maestro)
   · Importar desde el PDF de Séneca (sin fotos; solo «Nombre I.»).
   · Nombre visible, orden de la fila, avatar y activo/inactivo.
   El orden es el de la autoevaluación: el mismo en que se ponen
   en fila.
   ========================================================= */
window.Alumnado = (function () {

  var $ = function (id) { return document.getElementById(id); };

  function normal(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  }

  function abrir() {
    var p = $('pAlumnado');
    p.innerHTML =
      '<div class="panel-cab"><div><h2>Alumnado</h2><p class="tenue" id="alCuenta"></p></div>' +
        '<div class="grupo-btn">' +
          '<input type="file" id="alPdf" accept="application/pdf,.pdf" hidden>' +
          '<button class="btn" id="alImportar" title="También puedes arrastrar el PDF a cualquier parte de esta pantalla">📄 Importar de Séneca</button>' +
          '<button class="btn" id="alAnadir">➕ Añadir a mano</button>' +
        '</div>' +
      '</div>' +
      '<p class="soltar-estado" id="alEstado"></p>' +
      '<div class="lista-al" id="alLista"></div>' +
      '<div class="soltar-velo" id="alVelo"><b>📄 Suelta aquí el PDF de Séneca</b><span>Solo se leen el nombre y la inicial del primer apellido; las fotos no.</span></div>';

    var input = $('alPdf'), velo = $('alVelo'), dentro = 0;
    $('alImportar').onclick = function () { Sonido.click(); input.click(); };
    input.onchange = function () { leerPdf(input.files[0]); input.value = ''; };
    /* se puede soltar el PDF en cualquier parte del panel */
    p.ondragenter = function (e) { e.preventDefault(); dentro++; velo.classList.add('ver'); };
    p.ondragover = function (e) { e.preventDefault(); };
    p.ondragleave = function () { if (--dentro <= 0) { dentro = 0; velo.classList.remove('ver'); } };
    p.ondrop = function (e) { e.preventDefault(); dentro = 0; velo.classList.remove('ver'); leerPdf(e.dataTransfer.files[0]); };
    $('alAnadir').onclick = anadir;
    $('alLista').onclick = clicLista;
    $('alLista').onchange = cambioLista;
    pintar();
  }

  function pintar() {
    var lista = Datos.alumnos;
    var activos = lista.filter(function (a) { return a.activo; }).length;
    $('alCuenta').textContent = lista.length
      ? lista.length + ' en la lista · ' + activos + ' activos · el orden es el de la fila (los inactivos no salen en la autoevaluación)'
      : '';
    if (!lista.length) {
      $('alLista').innerHTML = '<div class="vacio">Aún no hay alumnado. Importa el PDF de Séneca (o arrástralo aquí) o añádelo a mano.</div>';
      Encajar.columnas($('alLista'), { ancho: 340 });
      return;
    }
    $('alLista').innerHTML = lista.map(function (a, i) {
      return '<div class="fila-al' + (a.activo ? '' : ' inactivo') + '" data-id="' + a.id + '">' +
        '<span class="num">' + (i + 1) + '</span>' +
        '<span class="flechas">' +
          '<button class="mini" data-acc="subir" title="Subir"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
          '<button class="mini" data-acc="bajar" title="Bajar"' + (i === lista.length - 1 ? ' disabled' : '') + '>▼</button>' +
        '</span>' +
        '<button class="boton-avatar" data-acc="avatar" title="Cambiar avatar">' + Avatares.html(a.avatar, 'avatar-fila') + '</button>' +
        '<input class="campo nombre-al" value="' + App.esc(a.nombre_visible) + '" maxlength="40" aria-label="Nombre visible">' +
        '<label class="interruptor" title="' + (a.activo ? 'Activo: sale en la autoevaluación' : 'Inactivo: no sale en la autoevaluación') + '">' +
          '<input type="checkbox" data-acc="activo"' + (a.activo ? ' checked' : '') + ' aria-label="Activo"><i></i></label>' +
        '<button class="mini peligro-suave" data-acc="borrar" title="Borrar">🗑</button>' +
      '</div>';
    }).join('');
    Encajar.vigilar('alumnado', function () { return Encajar.columnas($('alLista'), { ancho: 340, anchoMin: 280, max: 3 }); });
  }

  function alumno(id) { return Datos.alumnos.filter(function (a) { return a.id === id; })[0]; }

  function fallo(e) { App.aviso(e.message, 'mal'); pintar(); }

  function clicLista(e) {
    var b = e.target.closest('[data-acc]');
    if (!b || b.tagName === 'INPUT') return;
    var id = b.closest('.fila-al').getAttribute('data-id'), a = alumno(id);
    var acc = b.getAttribute('data-acc');
    Sonido.click();
    if (acc === 'subir' || acc === 'bajar') mover(a, acc === 'subir' ? -1 : 1);
    else if (acc === 'avatar') elegirAvatar(a);
    else if (acc === 'borrar') borrar(a);
  }

  function cambioLista(e) {
    var fila = e.target.closest('.fila-al');
    if (!fila) return;
    var a = alumno(fila.getAttribute('data-id'));
    if (e.target.classList.contains('nombre-al')) {
      var v = e.target.value.trim().slice(0, 40);
      if (!v) { e.target.value = a.nombre_visible; return; }
      if (v === a.nombre_visible) return;
      Datos.guardarAlumno(a.id, { nombre_visible: v }).then(function () { App.aviso('Guardado'); }, fallo);
    } else if (e.target.getAttribute('data-acc') === 'activo') {
      Datos.guardarAlumno(a.id, { activo: e.target.checked }).then(pintar, fallo);
    }
  }

  function mover(a, paso) {
    var l = Datos.alumnos, i = l.indexOf(a), j = i + paso;
    if (j < 0 || j >= l.length) return;
    l.splice(i, 1);
    l.splice(j, 0, a);
    pintar();
    Datos.reordenar('alumnos', l).catch(fallo);
  }

  function borrar(a) {
    Dialogo.confirmar('¿Borrar a ' + a.nombre_visible + '?',
      'Se borran también todas sus respuestas. Si solo no va a estar un tiempo, mejor desmárcalo como activo.',
      'Borrar', true).then(function (si) {
      if (si) Datos.borrarAlumno(a.id).then(pintar, fallo);
    });
  }

  function anadir() {
    Sonido.click();
    Dialogo.pedir({
      titulo: 'Añadir alumno', texto: 'Nombre y la inicial del primer apellido, como se verá en la pizarra.',
      campo: true, pista: 'p. ej. Lucía G.', aceptar: 'Añadir',
      comprobar: function (v) { return v.trim() ? '' : 'Escribe un nombre.'; }
    }).then(function (v) {
      if (v === null) return;
      var orden = Datos.alumnos.reduce(function (m, a) { return Math.max(m, a.orden); }, 0) + 1;
      var avatar = Avatares.libre(Datos.alumnos.map(function (a) { return a.avatar; }), orden);
      Datos.insertarAlumnos([{ nombre_visible: v.trim().slice(0, 40), orden: orden, avatar: avatar }]).then(pintar, fallo);
    });
  }

  /* ---------------- avatar ---------------- */
  function elegirAvatar(a) {
    var c = document.getElementById('capaAvatar');
    if (!c) {
      c = document.createElement('div');
      c.className = 'capa';
      c.id = 'capaAvatar';
      document.body.appendChild(c);
    }
    var usados = {};
    Datos.alumnos.forEach(function (x) { if (x.id !== a.id) usados[x.avatar] = true; });
    var celdas = '';
    for (var i = 0; i < Avatares.TOTAL; i++) {
      var k = 'm' + i;
      celdas += '<button class="celda-avatar' + (k === a.avatar ? ' elegido' : '') + (usados[k] ? ' usado' : '') + '" data-k="' + k + '"' +
        (usados[k] ? ' title="Ya lo tiene otro alumno"' : '') + '>' + Avatares.svg(k) + '</button>';
    }
    c.innerHTML = '<div class="caja caja-ancha">' +
      '<h2>Elige el monstruito de ' + App.esc(a.nombre_visible) + '</h2>' +
      '<p class="sub">Los atenuados ya los tiene otro alumno (se pueden repetir igualmente).</p>' +
      '<div class="rejilla-avatares">' + celdas + '</div>' +
      '<div class="botones"><button class="btn" id="avCerrar">Cerrar</button></div></div>';
    c.classList.add('ver');
    c.onclick = function (e) {
      var b = e.target.closest('.celda-avatar');
      if (b) {
        Sonido.click();
        c.classList.remove('ver');
        Datos.guardarAlumno(a.id, { avatar: b.getAttribute('data-k') }).then(pintar, fallo);
      } else if (e.target === c || e.target.id === 'avCerrar') c.classList.remove('ver');
    };
  }

  /* ---------------- importación de Séneca ---------------- */
  function leerPdf(archivo) {
    if (!archivo) return;
    if (archivo.type !== 'application/pdf' && !/\.pdf$/i.test(archivo.name)) { App.aviso('El archivo tiene que ser un PDF', 'mal'); return; }
    var estado = $('alEstado');
    estado.textContent = 'Cargando el lector de PDF…';
    Seneca.leer(archivo, function (n, total) { estado.textContent = 'Leyendo página ' + n + ' de ' + total + '…'; })
      .then(function (r) {
        estado.textContent = '';
        if (!r.alumnos.length) throw new Error('No se han encontrado alumnos en el PDF. ¿Es la orla con fotos de Séneca?');
        revisar(r);
      })
      .catch(function (e) { estado.textContent = ''; Dialogo.avisar('No se ha podido importar', e.message); });
  }

  function revisar(r) {
    var nombres = Seneca.nombresVisibles(r.alumnos);
    r.alumnos = null;   // los apellidos completos no se guardan en ninguna parte
    var existentes = {};
    Datos.alumnos.forEach(function (a) { existentes[normal(a.nombre_visible)] = true; });

    var c = document.getElementById('capaImport');
    if (!c) {
      c = document.createElement('div');
      c.className = 'capa';
      c.id = 'capaImport';
      document.body.appendChild(c);
    }
    var grupo = [r.curso, r.unidad].filter(Boolean).join(' · ');
    c.innerHTML = '<div class="caja caja-ancha caja-izq">' +
      '<h2>Revisa la lista</h2>' +
      '<p class="sub">' + nombres.length + ' alumnos' + (grupo ? ' de ' + App.esc(grupo) : '') +
        '. Así se verán en la pizarra: corrige lo que haga falta y desmarca a quien no quieras añadir. ' +
        'El orden es el de Séneca; luego puedes cambiarlo para que coincida con la fila.</p>' +
      '<div class="lista-import filas">' + nombres.map(function (n, i) {
        var ya = existentes[normal(n)];
        return '<label class="fila-import' + (ya ? ' ya' : '') + '">' +
          '<input type="checkbox"' + (ya ? '' : ' checked') + '>' +
          '<span class="num">' + (i + 1) + '</span>' +
          '<input class="campo" value="' + App.esc(n) + '" maxlength="40">' +
          (ya ? '<small>ya está en la lista</small>' : '') +
        '</label>';
      }).join('') + '</div>' +
      '<div class="botones reparto capa-pie"><button class="btn" id="imNo">Cancelar</button>' +
      '<button class="btn principal" id="imSi">Añadir a la clase</button></div></div>';
    c.classList.add('ver');
    $('imNo').onclick = function () { Sonido.click(); c.classList.remove('ver'); };
    $('imSi').onclick = function () {
      var elegidos = Array.prototype.filter.call(c.querySelectorAll('.fila-import'), function (f) {
        return f.querySelector('input[type=checkbox]').checked;
      }).map(function (f) { return f.querySelector('.campo').value.trim().slice(0, 40); })
        .filter(function (n) { return n && !existentes[normal(n)]; });
      if (!elegidos.length) { App.aviso('No hay nadie nuevo que añadir'); return; }
      var orden = Datos.alumnos.reduce(function (m, a) { return Math.max(m, a.orden); }, 0);
      var usados = Datos.alumnos.map(function (a) { return a.avatar; });
      var filas = elegidos.map(function (n) {
        var av = Avatares.libre(usados, orden + 1);
        usados.push(av);
        return { nombre_visible: n, orden: ++orden, avatar: av };
      });
      $('imSi').disabled = true;
      Datos.insertarAlumnos(filas).then(function (nuevos) {
        c.classList.remove('ver');
        pintar();
        Sonido.si();
        if (App.animar()) FX.lluvia(80);
        App.aviso('✅ ' + nuevos.length + ' alumnos añadidos');
      }, function (e) { $('imSi').disabled = false; App.aviso(e.message, 'mal'); });
    };
  }

  return { abrir: abrir };

})();
