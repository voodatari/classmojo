/* =========================================================
   Ficha · ventana de edición genérica (conductas y premios)
   campos: [{id, etiqueta, tipo: 'texto'|'numero'|'opciones'|'icono'|'color',
             min, max, largo, opciones: [[valor, texto]], pista}]
   comprobar(valores) → '' o el texto del error
   guardar(valores)   → promesa
   ========================================================= */
window.Ficha = (function () {

  var $ = function (id) { return document.getElementById(id); };
  var COLORES = ['#4C8DFF', '#8B5CF6', '#F59E0B', '#14B8A6', '#22A45D', '#E84E9C', '#00B8D9', '#FF8A3D', '#6366F1', '#84CC16', '#8C93A8'];

  function campoHTML(c, v) {
    var val = v[c.id];
    var html = '<label for="fi_' + c.id + '">' + App.esc(c.etiqueta) + '</label>';
    if (c.tipo === 'texto') {
      return html + '<input class="campo" id="fi_' + c.id + '" maxlength="' + (c.largo || 90) + '" value="' + App.esc(val || '') + '" placeholder="' + App.esc(c.pista || '') + '">';
    }
    if (c.tipo === 'numero') {
      return html + '<input class="campo" id="fi_' + c.id + '" type="number" min="' + c.min + '" max="' + c.max + '" value="' + (val == null ? '' : val) + '">';
    }
    if (c.tipo === 'opciones') {
      return html + '<select class="campo" id="fi_' + c.id + '">' + c.opciones.map(function (o) {
        return '<option value="' + o[0] + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + App.esc(o[1]) + '</option>';
      }).join('') + '</select>';
    }
    if (c.tipo === 'color') {
      return '<label>' + App.esc(c.etiqueta) + '</label><div class="muestras" data-campo="' + c.id + '">' + COLORES.map(function (col) {
        return '<button type="button" class="muestra' + (col.toLowerCase() === String(val).toLowerCase() ? ' elegido' : '') + '" data-v="' + col + '" style="background:' + col + '" aria-label="' + col + '"></button>';
      }).join('') + '</div>';
    }
    if (c.tipo === 'icono') {
      return '<label>' + App.esc(c.etiqueta) + '</label><div class="rejilla-iconos" data-campo="' + c.id + '">' + Iconos.elegibles.map(function (k) {
        return '<button type="button" class="celda-icono' + (k === val ? ' elegido' : '') + '" data-v="' + k + '">' + Iconos.html(k) + '</button>';
      }).join('') + '</div>';
    }
    return '';
  }

  function abrir(op) {
    var v = Object.assign({}, op.valores);
    var capa = $('capaFicha');
    if (!capa) {
      capa = document.createElement('div');
      capa.className = 'capa';
      capa.id = 'capaFicha';
      document.body.appendChild(capa);
    }
    capa.innerHTML = '<form class="caja caja-ancha caja-izq" id="fiForm" novalidate>' +
      '<h2>' + App.esc(op.titulo) + '</h2>' +
      '<div class="filas">' + op.campos.map(function (c) { return campoHTML(c, v); }).join('') + '</div>' +
      '<p class="aviso mal oculto" id="fiMal"></p>' +
      '<div class="botones reparto capa-pie">' +
        '<div class="grupo"><button type="button" class="btn" id="fiNo">Cancelar</button>' +
        (op.borrar ? '<button type="button" class="btn peligro" id="fiBorrar">Borrar</button>' : '') + '</div>' +
        '<div class="grupo"><button type="submit" class="btn principal" id="fiSi">Guardar</button></div>' +
      '</div></form>';
    capa.classList.add('ver');

    /* rejillas de elección (color e icono) */
    Array.prototype.forEach.call(capa.querySelectorAll('[data-campo]'), function (rej) {
      rej.onclick = function (e) {
        var b = e.target.closest('[data-v]'); if (!b) return;
        v[rej.getAttribute('data-campo')] = b.getAttribute('data-v');
        Array.prototype.forEach.call(rej.children, function (x) { x.classList.toggle('elegido', x === b); });
      };
    });
    function mal(t) { $('fiMal').textContent = t; $('fiMal').classList.remove('oculto'); }
    function cerrar() { capa.classList.remove('ver'); }
    $('fiNo').onclick = function () { Sonido.click(); cerrar(); };
    if (op.borrar) $('fiBorrar').onclick = function () {
      Dialogo.confirmar('¿Borrarlo?', op.textoBorrar || 'No se puede deshacer.', 'Borrar', true).then(function (si) {
        if (!si) return;
        op.borrar().then(cerrar, function (e) { mal(e.message); });
      });
    };
    $('fiForm').onsubmit = function (e) {
      e.preventDefault();
      op.campos.forEach(function (c) {
        var el = $('fi_' + c.id);
        if (!el) return;
        v[c.id] = c.tipo === 'numero' ? Math.round(+el.value) : c.tipo === 'texto' ? el.value.trim() : el.value;
      });
      for (var i = 0; i < op.campos.length; i++) {
        var c = op.campos[i];
        if (c.tipo === 'texto' && c.obligatorio && !v[c.id]) return mal('Falta: ' + c.etiqueta.toLowerCase() + '.');
        if (c.tipo === 'numero' && !(v[c.id] >= c.min && v[c.id] <= c.max)) return mal(c.etiqueta + ': de ' + c.min + ' a ' + c.max + '.');
      }
      var err = op.comprobar ? op.comprobar(v) : '';
      if (err) return mal(err);
      $('fiSi').disabled = true;
      op.guardar(v).then(function () { cerrar(); }, function (e2) { $('fiSi').disabled = false; mal(e2.message); });
    };
    var primero = capa.querySelector('input.campo');
    if (primero) setTimeout(function () { primero.focus(); }, 60);
  }

  return { abrir: abrir, COLORES: COLORES };

})();
