/* =========================================================
   Objetivos (modo maestro)
   Crear, editar, ordenar y desactivar. No se borran: las
   sesiones pasadas los necesitan para la revisión.
   Cambiar el umbral o los puntos no altera lo ya hecho (cada
   sesión guarda los suyos al empezar).
   ========================================================= */
window.Objetivos = (function () {

  var $ = function (id) { return document.getElementById(id); };
  var COLORES = ['#4C8DFF', '#8B5CF6', '#F59E0B', '#14B8A6', '#22A45D', '#E84E9C', '#00B8D9', '#FF8A3D', '#6366F1', '#84CC16'];

  function abrir() {
    $('pObjetivos').innerHTML =
      '<div class="panel-cab"><h2>Objetivos</h2>' +
        '<button class="btn principal" id="obNuevo">➕ Nuevo objetivo</button></div>' +
      '<p class="tenue">Solo los activos salen en la pizarra. Se consigue si el % de «sí» entre los presentes llega al umbral.</p>' +
      '<div class="lista-ob" id="obLista"></div>';
    $('obNuevo').onclick = function () { Sonido.click(); editar(null); };
    $('obLista').onclick = clic;
    $('obLista').onchange = cambio;
    pintar();
  }

  function pintar() {
    var l = Datos.objetivos;
    $('obLista').innerHTML = l.map(function (o, i) {
      return '<div class="fila-ob' + (o.activo ? '' : ' inactivo') + '" data-id="' + o.id + '" style="--c:' + o.color + '">' +
        '<span class="flechas">' +
          '<button class="mini" data-acc="subir" title="Subir"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
          '<button class="mini" data-acc="bajar" title="Bajar"' + (i === l.length - 1 ? ' disabled' : '') + '>▼</button>' +
        '</span>' +
        Iconos.html(o.icono, 'ico-fila') +
        '<div class="ob-texto"><b>' + App.esc(o.descripcion || o.titulo) + '</b><small>' + (o.descripcion ? App.esc(o.titulo) : '') + '</small></div>' +
        '<span class="etq">' + o.umbral_pct + ' % · +' + o.puntos_grupo + '</span>' +
        '<label class="interruptor" title="Activo"><input type="checkbox" data-acc="activo"' + (o.activo ? ' checked' : '') + '><i></i><span>Activo</span></label>' +
        '<button class="mini" data-acc="editar" title="Editar">✏️</button>' +
      '</div>';
    }).join('') || '<div class="vacio">No hay objetivos.</div>';
    Encajar.vigilar('objetivos', function () { return Encajar.columnas($('obLista'), { ancho: 520, anchoMin: 420, max: 2 }); });
  }

  function objetivo(id) { return Datos.objetivo(id); }
  function fallo(e) { App.aviso(e.message, 'mal'); pintar(); }

  function clic(e) {
    var b = e.target.closest('[data-acc]');
    if (!b || b.tagName === 'INPUT') return;
    var o = objetivo(b.closest('.fila-ob').getAttribute('data-id'));
    var acc = b.getAttribute('data-acc');
    Sonido.click();
    if (acc === 'editar') editar(o);
    else {
      var l = Datos.objetivos, i = l.indexOf(o), j = i + (acc === 'subir' ? -1 : 1);
      if (j < 0 || j >= l.length) return;
      l.splice(i, 1);
      l.splice(j, 0, o);
      pintar();
      Datos.reordenar('objetivos', l).catch(fallo);
    }
  }

  function cambio(e) {
    if (e.target.getAttribute('data-acc') !== 'activo') return;
    var o = objetivo(e.target.closest('.fila-ob').getAttribute('data-id'));
    Datos.guardarObjetivo(o.id, { activo: e.target.checked }).then(pintar, fallo);
  }

  /* ---------------- editor ---------------- */
  function editar(o) {
    var c = Datos.clase;
    var v = o ? Object.assign({}, o) : {
      titulo: '', descripcion: '', icono: 'estrella', color: COLORES[Datos.objetivos.length % COLORES.length],
      umbral_pct: c.umbral_defecto_pct, puntos_grupo: c.puntos_grupo_defecto
    };
    var capa = document.getElementById('capaObjetivo');
    if (!capa) {
      capa = document.createElement('div');
      capa.className = 'capa';
      capa.id = 'capaObjetivo';
      document.body.appendChild(capa);
    }
    capa.innerHTML = '<form class="caja caja-ancha caja-izq" id="edForm" novalidate>' +
      '<h2>' + (o ? 'Editar objetivo' : 'Nuevo objetivo') + '</h2>' +
      '<div class="filas">' +
        '<label for="edDesc">Descripción corta</label>' +
        '<input class="campo" id="edDesc" maxlength="200" value="' + App.esc(v.descripcion) + '" placeholder="p. ej. Aula recogida">' +
        '<label for="edTitulo">Detalle</label>' +
        '<input class="campo" id="edTitulo" maxlength="90" value="' + App.esc(v.titulo) + '" placeholder="p. ej. Aula recogida antes de la sirena">' +
        '<div class="dos-col">' +
          '<div><label for="edUmbral">Umbral: % de «sí» entre los presentes</label>' +
            '<input class="campo" id="edUmbral" type="number" min="1" max="100" value="' + v.umbral_pct + '"></div>' +
          '<div><label for="edPuntos">Puntos al bote si se consigue</label>' +
            '<input class="campo" id="edPuntos" type="number" min="0" max="100" value="' + v.puntos_grupo + '"></div>' +
        '</div>' +
        '<label>Color</label>' +
        '<div class="muestras" id="edColores">' + COLORES.map(function (col) {
          return '<button type="button" class="muestra' + (col.toLowerCase() === v.color.toLowerCase() ? ' elegido' : '') + '" data-c="' + col + '" style="background:' + col + '" aria-label="' + col + '"></button>';
        }).join('') + '</div>' +
        '<label>Icono</label>' +
        '<div class="rejilla-iconos" id="edIconos">' + Iconos.elegibles.map(function (k) {
          return '<button type="button" class="celda-icono' + (k === v.icono ? ' elegido' : '') + '" data-k="' + k + '">' + Iconos.html(k) + '</button>';
        }).join('') + '</div>' +
      '</div>' +
      '<p class="aviso mal oculto" id="edMal"></p>' +
      '<div class="botones reparto capa-pie"><button type="button" class="btn" id="edNo">Cancelar</button>' +
      '<button type="submit" class="btn principal" id="edSi">Guardar</button></div>' +
    '</form>';
    capa.classList.add('ver');

    $('edColores').onclick = function (e) {
      var b = e.target.closest('.muestra'); if (!b) return;
      v.color = b.getAttribute('data-c');
      Array.prototype.forEach.call(this.children, function (x) { x.classList.toggle('elegido', x === b); });
    };
    $('edIconos').onclick = function (e) {
      var b = e.target.closest('.celda-icono'); if (!b) return;
      v.icono = b.getAttribute('data-k');
      Array.prototype.forEach.call(this.children, function (x) { x.classList.toggle('elegido', x === b); });
    };
    $('edNo').onclick = function () { Sonido.click(); capa.classList.remove('ver'); };
    $('edForm').onsubmit = function (e) {
      e.preventDefault();
      var campos = {
        titulo: $('edTitulo').value.trim(),
        descripcion: $('edDesc').value.trim(),
        icono: v.icono, color: v.color,
        umbral_pct: Math.round(+$('edUmbral').value),
        puntos_grupo: Math.round(+$('edPuntos').value)
      };
      var err = !campos.titulo ? 'Escribe el detalle.'
        : !(campos.umbral_pct >= 1 && campos.umbral_pct <= 100) ? 'El umbral va de 1 a 100.'
        : !(campos.puntos_grupo >= 0 && campos.puntos_grupo <= 100) ? 'Los puntos van de 0 a 100.' : '';
      if (err) { $('edMal').textContent = err; $('edMal').classList.remove('oculto'); return; }
      if (!o) campos.orden = Datos.objetivos.reduce(function (m, x) { return Math.max(m, x.orden); }, 0) + 1;
      $('edSi').disabled = true;
      Datos.guardarObjetivo(o ? o.id : null, campos).then(function () {
        capa.classList.remove('ver');
        pintar();
        App.aviso('Objetivo guardado');
      }, function (e2) {
        $('edSi').disabled = false;
        $('edMal').textContent = e2.message;
        $('edMal').classList.remove('oculto');
      });
    };
    setTimeout(function () { $('edDesc').focus(); }, 60);
  }

  return { abrir: abrir };

})();
