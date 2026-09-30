/* =========================================================
   Séneca · importar la lista de clase desde el PDF de la orla
   ---------------------------------------------------------
   Es el lector de pdf-import.js del Redondeador, con un cambio
   deliberado: AQUÍ NO SE LEEN LAS FOTOS. Ni se recortan ni se
   dibuja la página: solo se leen los textos «Apellidos, Nombre».
   Y de los apellidos solo se queda la inicial del primero
   («Lucía G.»): el nombre completo no sale del navegador.

   El PDF de Séneca («DetCuaAluFot») es una cuadrícula de 4
   columnas; se ordena por filas y columnas, que es el orden
   alfabético de la lista.
   ========================================================= */
window.Seneca = (function (global) {

  var PDFJS_VERSION = '3.11.174';
  var PDFJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS_VERSION + '/';
  var promesa = null;

  function cargarPdfJs() {
    if (global.pdfjsLib) return Promise.resolve(global.pdfjsLib);
    if (promesa) return promesa;
    promesa = new Promise(function (ok, mal) {
      var s = document.createElement('script');
      s.src = PDFJS_BASE + 'pdf.min.js';
      s.onload = function () {
        global.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + 'pdf.worker.min.js';
        ok(global.pdfjsLib);
      };
      s.onerror = function () { promesa = null; mal(new Error('No se pudo cargar el lector de PDF. Comprueba la conexión a internet.')); };
      document.head.appendChild(s);
    });
    return promesa;
  }

  /* Devuelve {curso, unidad, alumnos: [{nombre, apellidos}]} — los
     apellidos solo viven en memoria hasta calcular la inicial. */
  function leer(archivo, alAvanzar) {
    var pdfjs;
    return cargarPdfJs().then(function (p) {
      pdfjs = p;
      return archivo.arrayBuffer();
    }).then(function (buf) {
      return pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
    }).then(function (pdf) {
      var res = { curso: '', unidad: '', alumnos: [] };
      var cadena = Promise.resolve();
      for (var n = 1; n <= pdf.numPages; n++) {
        (function (num) {
          cadena = cadena.then(function () {
            if (alAvanzar) alAvanzar(num, pdf.numPages);
            return pdf.getPage(num);
          }).then(function (pagina) {
            var vista = pagina.getViewport({ scale: 1 });
            return pagina.getTextContent().then(function (tc) {
              var lineas = unirLineas(tc.items, vista, pdfjs);
              if (!res.unidad) res.unidad = cabecera(lineas, /^Unidad\s*:/i);
              if (!res.curso) res.curso = cabecera(lineas, /^Curso\s*:/i);
              lineas.filter(function (l) { return esNombre(l.text); })
                .sort(function (a, b) { return (Math.abs(a.y - b.y) > a.size * 0.5 ? a.y - b.y : 0) || (a.x - b.x); })
                .forEach(function (l) {
                  var coma = l.text.indexOf(',');
                  res.alumnos.push({ apellidos: l.text.slice(0, coma).trim(), nombre: l.text.slice(coma + 1).trim() });
                });
              pagina.cleanup();
            });
          });
        })(n);
      }
      return cadena.then(function () { pdf.destroy(); return res; },
                         function (e) { pdf.destroy(); throw e; });
    });
  }

  /* Une fragmentos de texto contiguos de la misma línea (igual que en el Redondeador) */
  function unirLineas(items, viewport, pdfjs) {
    var trozos = [];
    items.forEach(function (item) {
      if (!item.str || !item.str.trim()) return;
      var t = pdfjs.Util.transform(viewport.transform, item.transform);
      var size = Math.hypot(t[2], t[3]);
      if (!size || Math.abs(t[1]) > size * 0.05 || Math.abs(t[2]) > size * 0.05) return;   // texto girado
      trozos.push({ str: item.str, x: t[4], y: t[5], w: item.width * viewport.scale, size: size });
    });
    trozos.sort(function (a, b) { return a.x - b.x; });
    var lineas = [];
    trozos.forEach(function (f) {
      var l = lineas.filter(function (l) {
        return Math.abs(l.y - f.y) < l.size * 0.35 && f.x - l.right < l.size * 0.8 && f.x - l.right > -l.size * 0.5;
      })[0];
      if (l) {
        l.text += (f.x - l.right > l.size * 0.15 ? ' ' : '') + f.str;
        l.right = Math.max(l.right, f.x + f.w);
      } else {
        lineas.push({ text: f.str, x: f.x, y: f.y, right: f.x + f.w, size: f.size });
      }
    });
    lineas.forEach(function (l) { l.text = l.text.replace(/\s+/g, ' ').trim(); });
    return lineas;
  }

  function cabecera(lineas, re) {
    var l = lineas.filter(function (l) { return re.test(l.text); })[0];
    return l ? l.text.replace(re, '').trim() : '';
  }

  function esNombre(texto) { return /^[^,:\d/]{2,},\s*[^,:\d/]{1,}$/.test(texto); }

  /* ---------------- nombre visible ---------------- */
  var PARTICULAS = /^(de|del|la|las|los|el|y|i|da|do|dos|das|van|von|mac|mc|san|santa)$/i;

  function capitalizar(s) {
    return String(s || '').toLowerCase().replace(/(^|[\s-])(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); });
  }

  /* palabras del primer apellido, sin partículas: «de la Torre» → Torre */
  function apellidoUtil(apellidos) {
    var palabras = String(apellidos || '').trim().split(/\s+/).filter(Boolean);
    var utiles = palabras.filter(function (p) { return !PARTICULAS.test(p); });
    return utiles;
  }

  /* «GARCÍA LÓPEZ, MARÍA JOSÉ» → «María José G.». Si en la lista hay
     dos iguales, se alarga la inicial («Ga.» / «Go.») y, si aún
     chocan, se añade la del segundo apellido («G. Sa.» / «G. So.»).
     Si ni así se distinguen, el maestro lo corrige en la revisión. */
  function nombresVisibles(lista) {
    var base = lista.map(function (a) {
      var ap = apellidoUtil(a.apellidos);
      return { nombre: capitalizar(a.nombre), a1: capitalizar(ap[0] || ''), a2: capitalizar(ap[1] || '') };
    });
    function forma(b, largo, largo2) {
      var ini = b.a1 ? b.a1.slice(0, largo) + '.' : '';
      if (largo2 && b.a2) ini += ' ' + b.a2.slice(0, largo2) + '.';
      return (b.nombre + (ini ? ' ' + ini : '')).trim();
    }
    var res = base.map(function (b) { return forma(b, 1, 0); });
    [[2, 0], [3, 0], [1, 1], [1, 2], [1, 3]].forEach(function (paso) {
      var cuenta = {};
      res.forEach(function (r) { var k = r.toLowerCase(); cuenta[k] = (cuenta[k] || 0) + 1; });
      res = res.map(function (r, i) { return cuenta[r.toLowerCase()] > 1 ? forma(base[i], paso[0], paso[1]) : r; });
    });
    return res.map(function (r) { return r.slice(0, 40); });
  }

  return { leer: leer, nombresVisibles: nombresVisibles };

})(window);
