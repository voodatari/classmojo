/* =========================================================
   Escala fija · ClassMojo se ve igual con cualquier escala de Windows
   Con la escala de Windows al 125 % o al 150 %, el navegador solo
   tiene 1536 × 864 o 1280 × 720 px en lugar de 1920 × 1080: los
   tamaños fijos ocupan proporcionalmente más, saltan los diseños
   compactos y algunos campos se quedan pequeños.
   Con <html class="escala-fija"> la app y las ventanas se amplían o
   reducen con CSS zoom para ocupar la misma proporción de pantalla que
   en un monitor 1080p al 100 % (referencia: 1920 × 900 px útiles).
   El CSS hace el resto (ver «escala fija» en app.css).
   En pantallas estrechas (móvil, tableta en vertical) no se aplica.
   Activada por defecto; el interruptor está en Ajustes y la elección
   se guarda solo en este ordenador.
   Se carga en el <head> para que la clase esté puesta antes de pintar.
   ========================================================= */
window.Escala = (function (global) {

  var K_ESCALA = 'classmojo.escala';   // '1' / '0' · sin guardar = activada
  var REF_ANCHO = 1920, REF_ALTO = 900;
  var MIN = 0.5, MAX = 2, ANCHO_MINIMO = 900;

  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function escribir(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var activa = leer(K_ESCALA) !== '0';

  function calcular() {
    var w = global.innerWidth, h = global.innerHeight;
    if (w < ANCHO_MINIMO) return 1;
    var z = Math.min(w / REF_ANCHO, h / REF_ALTO);
    return Math.round(Math.min(MAX, Math.max(MIN, z)) * 100) / 100;
  }

  function factor() { return activa ? calcular() : 1; }

  function texto() {
    return activa
      ? 'Activada: ahora mismo al ' + Math.round(factor() * 100) + ' %. Solo en este ordenador.'
      : 'Se ve igual aunque Windows use una escala del 125 % o 150 %. Solo en este ordenador.';
  }

  function aplicar() {
    var raiz = document.documentElement;
    raiz.classList.toggle('escala-fija', activa);
    raiz.style.setProperty('--escala', String(factor()));
    var nota = document.getElementById('ajEscalaNota');
    if (nota) nota.textContent = texto();
  }
  aplicar();
  global.addEventListener('resize', aplicar);

  /* activar() lee; activar(true/false) cambia, guarda y recoloca lo que se ajusta al tamaño */
  function activar(v) {
    if (v === undefined) return activa;
    activa = !!v;
    escribir(K_ESCALA, activa ? '1' : '0');
    aplicar();
    global.dispatchEvent(new Event('resize'));
    return activa;
  }

  return { activar: activar, factor: factor, texto: texto };

})(window);
