/* =========================================================
   Iconos · Microsoft Fluent Emoji 3D (licencia MIT)
   https://github.com/microsoft/fluentui-emoji
   Los PNG están copiados en img/emoji/ (no dependen de ningún
   CDN, por si la red del centro lo bloquea). Si falta alguno,
   se ve el emoji del sistema.
   ========================================================= */
window.Iconos = (function () {

  /* clave (= nombre del archivo) : emoji de reserva */
  var LISTA = {
    memo: '📝', mano: '✋', cronometro: '⏱️', meta: '🏁', escoba: '🧹',
    libros: '📚', libro: '📖', cuaderno: '📓', lapiz: '✏️', escribir: '✍️', regla: '📏', abaco: '🧮',
    mochila: '🎒', escuela: '🏫', campana: '🔔', despertador: '⏰', reloj_arena: '⏳', calendario: '🗓️',
    silencio: '🤫', cremallera: '🤐', oreja: '👂', bocadillo: '💬', bombilla: '💡', cerebro: '🧠',
    puzle: '🧩', diana: '🎯', apreton: '🤝', abrazo: '🫂', pulgar: '👍', aplauso: '👏', biceps: '💪',
    corazon: '💚', corazon2: '💙', huellas: '👣', tortuga: '🐢', cohete: '🚀', estrella: '🌟',
    estrella2: '⭐', chispas: '✨', trofeo: '🏆', medalla: '🏅', corona: '👑', gema: '💎', moneda: '🪙',
    sol: '☀️', arcoiris: '🌈', brote: '🌱', trebol: '🍀', girasol: '🌻', paloma: '🕊️', papelera: '🗑️',
    reciclar: '♻️', jabon: '🧼', paleta: '🎨', notas: '🎶', mundo: '🌍', microscopio: '🔬', check: '✅',
    sonrisa: '😃', contento: '😊', gafas: '😎', alucina: '🤩', pensando: '🤔', fiesta: '🎉',
    bote: '🫙', miel: '🍯', candado: '🔒', casa: '🏠'
  };

  /* los que se ofrecen al crear un objetivo (el resto los usa la app) */
  var ELEGIBLES = ['memo', 'mano', 'cronometro', 'meta', 'escoba', 'libros', 'libro', 'cuaderno', 'lapiz',
    'escribir', 'regla', 'abaco', 'mochila', 'escuela', 'campana', 'despertador', 'reloj_arena', 'calendario',
    'silencio', 'cremallera', 'oreja', 'bocadillo', 'bombilla', 'cerebro', 'puzle', 'diana', 'apreton',
    'abrazo', 'pulgar', 'aplauso', 'biceps', 'corazon', 'corazon2', 'huellas', 'tortuga', 'cohete', 'estrella',
    'chispas', 'trofeo', 'medalla', 'sol', 'arcoiris', 'brote', 'trebol', 'girasol', 'paloma', 'papelera',
    'reciclar', 'jabon', 'paleta', 'notas', 'mundo', 'microscopio', 'check'];

  function existe(k) { return Object.prototype.hasOwnProperty.call(LISTA, k); }

  /* <img> con el emoji de reserva si no carga */
  function html(clave, clase) {
    var k = existe(clave) ? clave : 'estrella';
    return '<img class="ico ' + (clase || '') + '" src="img/emoji/' + k + '.png" alt="" draggable="false" ' +
      'data-reserva="' + LISTA[k] + '" onerror="Iconos.reserva(this)">';
  }
  function reserva(img) {
    var s = document.createElement('span');
    s.className = img.className + ' ico-texto';
    s.textContent = img.getAttribute('data-reserva') || '⭐';
    img.replaceWith(s);
  }

  return { html: html, reserva: reserva, elegibles: ELEGIBLES, existe: existe };

})();
