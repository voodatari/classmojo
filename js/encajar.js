/* =========================================================
   Encajar · que todo quepa sin desplazar (idea del selector de
   alumnos del Redondeador)
   · rejilla(): prueba cada número de columnas y se queda con el que
     permite las tarjetas más grandes sin salirse del hueco.
   · filas(): reparte el alto entre las filas de una lista.
   Solo si ni con el tamaño mínimo cabe, se deja desplazar.
   Se vuelve a calcular al cambiar el tamaño de la ventana.
   ========================================================= */
window.Encajar = (function (global) {

  var vivos = [];   // cálculos a repetir al cambiar el tamaño

  /* el: contenedor (grid). op: {min, max, proporcion (alto/ancho), hueco} */
  function rejilla(el, op) {
    var n = el.children.length;
    if (!n) return;
    var hueco = op.hueco || 10, prop = op.proporcion || 1;
    el.style.gridTemplateColumns = '';
    el.classList.remove('desborda');
    var W = el.clientWidth, H = el.clientHeight;
    var mejor = null;
    for (var cols = 1; cols <= n; cols++) {
      var lado = Math.min(op.max, (W - (cols - 1) * hueco) / cols);
      var filas = Math.ceil(n / cols);
      var alto = filas * lado * prop + (filas - 1) * hueco;
      if (alto <= H && (!mejor || lado > mejor.lado)) mejor = { cols: cols, lado: lado };
    }
    if (!mejor || mejor.lado < op.min) {
      var c = Math.max(1, Math.floor((W + hueco) / (op.min + hueco)));
      mejor = { cols: c, lado: Math.min(op.max, (W - (c - 1) * hueco) / c) };
      el.classList.add('desborda');
    }
    var lado = Math.floor(mejor.lado);
    el.style.setProperty('--lado', lado + 'px');
    el.style.setProperty('--alto', Math.floor(lado * prop) + 'px');
    el.style.gridTemplateColumns = 'repeat(' + mejor.cols + ', ' + lado + 'px)';
  }

  /* el: lista (grid) con filas (op.fila) agrupadas bajo títulos
     (op.titulo, ocupan todo el ancho). Reparte el alto entre las filas,
     con un alto entre min y max; si en una columna no caben ni con el
     mínimo, prueba con más columnas (hasta op.columnas). */
  function filas(el, op) {
    el.classList.remove('desborda');
    el.style.removeProperty('--fila');
    var grupos = [], actual = null;
    Array.prototype.forEach.call(el.children, function (h) {
      if (op.titulo && h.matches(op.titulo)) { actual = { n: 0 }; grupos.push(actual); }
      else if (h.matches(op.fila)) { if (!actual) { actual = { n: 0, sinTitulo: true }; grupos.push(actual); } actual.n++; }
    });
    if (!grupos.length) return;
    var H = el.clientHeight, hueco = op.hueco || 6, tit = op.altoTitulo || 24;
    var nTit = grupos.filter(function (g) { return !g.sinTitulo; }).length;
    var maxCols = op.columnas || 1, elegido = null;
    for (var cols = 1; cols <= maxCols && !elegido; cols++) {
      var nFilas = grupos.reduce(function (s, g) { return s + Math.ceil(g.n / cols); }, 0);
      var alto = (H - nTit * tit - (nFilas + nTit - 1) * hueco) / nFilas;
      if (alto >= op.min || cols === maxCols) elegido = { cols: cols, alto: alto };
    }
    if (elegido.alto < op.min) { elegido.alto = op.min; el.classList.add('desborda'); }
    el.style.gridTemplateColumns = 'repeat(' + elegido.cols + ', minmax(0, 1fr))';
    el.classList.toggle('varias', elegido.cols > 1);
    el.style.setProperty('--fila', Math.floor(Math.min(op.max, elegido.alto)) + 'px');
  }

  /* Lista en columnas que se leen de arriba abajo (como la fila de clase).
     op: {ancho: ancho cómodo de columna, anchoMin: el mínimo si hace falta
     meter más para no desplazar, max: columnas como mucho, hueco}
     Primero las que pida el ancho; si así no cabe en el alto del panel,
     alguna más. Devuelve false si la lista ya no está en la página. */
  function columnas(el, op) {
    if (!el || !document.body.contains(el)) return false;
    var hijos = el.children, n = hijos.length, hueco = op.hueco || 14;
    if (!n || hijos[0].classList.contains('vacio')) { el.style.gridTemplateRows = ''; el.style.gridTemplateColumns = ''; return; }
    var W = el.clientWidth, max = op.max || 3;
    var cols = Math.max(1, Math.min(max, Math.floor((W + hueco) / (op.ancho + hueco)), n));
    var maxCols = Math.max(cols, Math.min(max + 1, Math.floor((W + hueco) / ((op.anchoMin || op.ancho) + hueco)), n));
    var panel = el.closest('.panel');
    /* getBoundingClientRect mide en píxeles de pantalla y offsetHeight en los
       de dentro del zoom de la escala fija: se pasa todo a los de dentro */
    var z = global.Escala ? Escala.factor() : 1;
    var H = panel ? (panel.getBoundingClientRect().bottom - el.getBoundingClientRect().top) / z - 24 : Infinity;
    /* se prueba de verdad cada opción y se mide: con columnas más
       estrechas los textos pasan a dos líneas y las filas crecen */
    function poner(c) {
      el.style.gridTemplateColumns = 'repeat(' + c + ', minmax(0, 1fr))';
      el.style.gridTemplateRows = 'repeat(' + Math.ceil(n / c) + ', auto)';
      return el.offsetHeight;
    }
    while (poner(cols) > H && cols < maxCols) cols++;
  }

  /* Registra un cálculo para repetirlo al cambiar de tamaño. clave evita duplicados. */
  function vigilar(clave, fn) {
    vivos = vivos.filter(function (v) { return v.clave !== clave; });
    vivos.push({ clave: clave, fn: fn });
    fn();
  }

  var t = null;
  global.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      vivos = vivos.filter(function (v) { return v.fn() !== false; });
    }, 80);
  });

  return { rejilla: rejilla, filas: filas, columnas: columnas, vigilar: vigilar };

})(window);
