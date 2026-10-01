/* =========================================================
   Rendimiento · modo ligero para equipos modestos
   Lo que más cuesta en un portátil con gráfica integrada moviendo una
   pantalla grande (o una pizarra 4K) son los desenfoques que se
   recalculan en cada fotograma: los halos del fondo (filter: blur) y
   el cristal esmerilado de chips, paneles y ventanas (backdrop-filter).
   En modo ligero (<html class="ligero">):
     · los halos llevan el desenfoque «pintado» en su degradado, sin filtro;
     · fuera el cristal esmerilado (los fondos translúcidos se oscurecen
       un poco para que todo se siga leyendo igual);
     · fuera las sombras difusas de los dibujos grandes y las formas
       flotantes del fondo;
     · el confeti, con la mitad de piezas.
   Se activa solo si el equipo parece modesto (la misma detección que en
   Juegos de aula); en Ajustes se puede encender o apagar a mano, y esa
   elección se guarda en este ordenador.
   Se carga en el <head> para que la clase esté puesta antes de pintar.
   ========================================================= */
window.Rendimiento = (function (global) {

  var K_LIGERO = 'classmojo.ligero';   // '1' / '0' · sin guardar = automático

  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function escribir(k, v) {
    try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {}
  }

  /* ---------- ¿Equipo modesto? ---------- */
  function nombreGrafica() {
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return '';
      var ext = gl.getExtension('WEBGL_debug_renderer_info');
      var n = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      var perder = gl.getExtension('WEBGL_lose_context');
      if (perder) perder.loseContext();
      return String(n || '');
    } catch (e) { return ''; }
  }

  function detectar() {
    var motivos = [];
    var hilos = navigator.hardwareConcurrency || 0;
    if (hilos && hilos <= 4) motivos.push('CPU de ' + hilos + ' hilos');
    var mem = navigator.deviceMemory;
    if (mem && mem <= 4) motivos.push(mem + ' GB de memoria');
    var gpu = nombreGrafica();
    var discreta = /nvidia|geforce|quadro|rtx|gtx|radeon rx|radeon pro|radeon r9|arc a\d/i.test(gpu);
    var integrada = !discreta &&
      /intel|uhd|iris|radeon\(tm\) graphics|radeon graphics|radeon vega|vega \d|mali|adreno|powervr|llvmpipe|swiftshader|basic render/i.test(gpu);
    var dpr = global.devicePixelRatio || 1;
    var pixeles = (screen.width * dpr) * (screen.height * dpr);
    if (integrada && pixeles >= 3.6e6) motivos.push('gráfica integrada con pantalla grande');
    return { modesto: motivos.length > 0, motivos: motivos, gpu: gpu };
  }

  var deteccion = detectar();
  var guardado = leer(K_LIGERO);
  var ligero = guardado === null ? deteccion.modesto : guardado === '1';

  function aplicar() { document.documentElement.classList.toggle('ligero', ligero); }
  aplicar();

  /* Texto para Ajustes: qué se ha decidido y por qué */
  function texto() {
    var auto = leer(K_LIGERO) === null;
    if (auto && deteccion.modesto) return 'Activado solo: este equipo parece modesto (' + deteccion.motivos.join(', ') + ').';
    if (auto) return 'Automático: este equipo va con soltura, así que están todos los efectos.';
    return ligero ? 'Activado a mano.' : 'Desactivado a mano.';
  }

  return {
    deteccion: deteccion,
    /* activo() lee; activo(true/false) lo fija a mano y lo guarda */
    activo: function (v) {
      if (v === undefined) return ligero;
      ligero = !!v;
      escribir(K_LIGERO, ligero ? '1' : '0');
      aplicar();
      return ligero;
    },
    automatico: function () { return leer(K_LIGERO) === null; },
    volverAutomatico: function () {
      escribir(K_LIGERO, null);
      ligero = deteccion.modesto;
      aplicar();
      return ligero;
    },
    texto: texto
  };

})(window);
