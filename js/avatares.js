/* =========================================================
   Avatares · monstruitos dibujados aquí mismo (SVG)
   ---------------------------------------------------------
   Sin fotos del alumnado y sin servicios externos: cada avatar
   sale de un número («m0», «m17»…) que decide el color, la forma
   del cuerpo, los ojos, la boca y lo que lleva en la cabeza.
   El mismo número dibuja siempre el mismo monstruo.
   Código propio: no hay licencias de terceros que revisar.
   ========================================================= */
window.Avatares = (function () {

  var TOTAL = 48;   // los que se ofrecen en el selector
  var PALETA = ['#7C5CFF', '#2BC4B4', '#4C8DFF', '#FF8A3D', '#F5C518', '#22A45D',
                '#E84E9C', '#8BD346', '#00B8D9', '#A66CFF', '#FFB020', '#3DDC97'];
  var TINTA = '#1B1F3B';

  /* generador pseudoaleatorio con semilla (mulberry32) */
  function azar(semilla) {
    var a = semilla >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function oscurecer(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.round((n >> 16) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  /* cuerpos: forma, altura de ojos y boca, parte de arriba y pies */
  var CUERPOS = [
    { svg: '<ellipse cx="50" cy="57" rx="35" ry="33"/>', ojos: 50, boca: 67, arriba: 24, pies: 88 },
    { svg: '<rect x="23" y="20" width="54" height="70" rx="27"/>', ojos: 45, boca: 63, arriba: 20, pies: 89 },
    { svg: '<path d="M18,55 A32,32 0 0 1 82,55 L82,86 q-8,8 -16,0 q-8,-8 -16,0 q-8,8 -16,0 q-8,-8 -16,0 Z"/>', ojos: 50, boca: 66, arriba: 23, pies: 0 },
    { svg: '<path d="M50,16 C74,16 86,50 86,66 C86,84 70,92 50,92 C30,92 14,84 14,66 C14,50 26,16 50,16 Z"/>', ojos: 51, boca: 69, arriba: 16, pies: 91 },
    { svg: '<ellipse cx="50" cy="62" rx="40" ry="27"/>', ojos: 56, boca: 71, arriba: 35, pies: 87 }
  ];

  function rasgos(n) {
    var r = azar((n + 1) * 2654435761);
    return {
      color: PALETA[n % PALETA.length],
      cuerpo: Math.floor(r() * CUERPOS.length),
      ojos: 1 + Math.floor(r() * 3),
      boca: Math.floor(r() * 4),
      cabeza: Math.floor(r() * 4),
      manchas: r() < 0.5
    };
  }

  function cabeza(tipo, c, color, oscuro) {
    var y = c.arriba;
    if (tipo === 0) {   // cuernos
      return '<polygon points="34,' + (y + 9) + ' 29,' + (y - 11) + ' 44,' + (y + 4) + '" fill="#FFE9A8"/>' +
             '<polygon points="66,' + (y + 9) + ' 71,' + (y - 11) + ' 56,' + (y + 4) + '" fill="#FFE9A8"/>';
    }
    if (tipo === 1) {   // antenas
      return '<path d="M42,' + (y + 5) + ' L35,' + (y - 10) + ' M58,' + (y + 5) + ' L65,' + (y - 10) + '" stroke="' + oscuro + '" stroke-width="3" stroke-linecap="round"/>' +
             '<circle cx="35" cy="' + (y - 11) + '" r="4.5" fill="' + color + '" stroke="' + oscuro + '" stroke-width="2"/>' +
             '<circle cx="65" cy="' + (y - 11) + '" r="4.5" fill="' + color + '" stroke="' + oscuro + '" stroke-width="2"/>';
    }
    if (tipo === 2) {   // orejas
      return '<circle cx="24" cy="' + (y + 13) + '" r="10" fill="' + color + '"/><circle cx="24" cy="' + (y + 13) + '" r="5" fill="#fff" opacity=".35"/>' +
             '<circle cx="76" cy="' + (y + 13) + '" r="10" fill="' + color + '"/><circle cx="76" cy="' + (y + 13) + '" r="5" fill="#fff" opacity=".35"/>';
    }
    return '';
  }

  function ojo(x, y, r) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff"/>' +
           '<circle cx="' + (x + r * 0.12) + '" cy="' + (y + r * 0.12) + '" r="' + (r * 0.5) + '" fill="' + TINTA + '"/>' +
           '<circle cx="' + (x + r * 0.3) + '" cy="' + (y - r * 0.2) + '" r="' + (r * 0.16) + '" fill="#fff"/>';
  }

  function ojos(n, y) {
    if (n === 1) return ojo(50, y, 11);
    if (n === 2) return ojo(38, y, 8) + ojo(62, y, 8);
    return ojo(34, y + 2, 6) + ojo(50, y - 4, 7) + ojo(66, y + 2, 6);
  }

  function boca(tipo, y) {
    var t = 'stroke="' + TINTA + '" stroke-width="3" stroke-linecap="round" fill="none"';
    if (tipo === 0) return '<path d="M40,' + y + ' Q50,' + (y + 9) + ' 60,' + y + '" ' + t + '/>';
    if (tipo === 1) return '<path d="M40,' + y + ' Q50,' + (y + 15) + ' 60,' + y + ' Z" fill="' + TINTA + '"/>' +
                           '<ellipse cx="50" cy="' + (y + 5.5) + '" rx="4.5" ry="2.6" fill="#FF8FB1"/>';
    if (tipo === 2) return '<path d="M38,' + y + ' Q50,' + (y + 10) + ' 62,' + y + '" ' + t + '/>' +
                           '<polygon points="42.5,' + (y + 2.6) + ' 46.5,' + (y + 3.8) + ' 44,' + (y + 8) + '" fill="#fff"/>' +
                           '<polygon points="53.5,' + (y + 3.8) + ' 57.5,' + (y + 2.6) + ' 56,' + (y + 8) + '" fill="#fff"/>';
    return '<ellipse cx="50" cy="' + (y + 3) + '" rx="4" ry="5" fill="' + TINTA + '"/>';
  }

  function numero(clave) {
    var m = /^m(\d{1,3})$/.exec(String(clave || ''));
    return m ? +m[1] : 0;
  }

  var cache = {};
  function svg(clave) {
    var n = numero(clave);
    if (cache[n]) return cache[n];
    var r = rasgos(n), c = CUERPOS[r.cuerpo], oscuro = oscurecer(r.color, 0.72);
    var s = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      cabeza(r.cabeza, c, r.color, oscuro) +
      (c.pies ? '<ellipse cx="37" cy="' + c.pies + '" rx="8" ry="5" fill="' + oscuro + '"/>' +
                '<ellipse cx="63" cy="' + c.pies + '" rx="8" ry="5" fill="' + oscuro + '"/>' : '') +
      '<g fill="' + r.color + '">' + c.svg + '</g>' +
      (r.manchas ? '<g fill="#fff" opacity=".2"><circle cx="33" cy="74" r="4.5"/><circle cx="67" cy="73" r="5.5"/><circle cx="60" cy="81" r="3"/></g>' : '') +
      '<circle cx="31" cy="' + (c.boca - 3) + '" r="4.5" fill="#FF8FB1" opacity=".35"/>' +
      '<circle cx="69" cy="' + (c.boca - 3) + '" r="4.5" fill="#FF8FB1" opacity=".35"/>' +
      ojos(r.ojos, c.ojos) + boca(r.boca, c.boca) +
      '</svg>';
    cache[n] = s;
    return s;
  }

  function html(clave, clase) {
    return '<span class="avatar ' + (clase || '') + '">' + svg(clave) + '</span>';
  }

  /* el primer avatar libre de la clase (para alumnos nuevos) */
  function libre(usados, desde) {
    var set = {};
    (usados || []).forEach(function (u) { set[u] = true; });
    for (var i = 0; i < TOTAL; i++) {
      var k = 'm' + ((i + (desde || 0)) % TOTAL);
      if (!set[k]) return k;
    }
    return 'm' + Math.floor(Math.random() * TOTAL);
  }

  return { TOTAL: TOTAL, svg: svg, html: html, libre: libre };

})();
