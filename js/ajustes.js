/* =========================================================
   Ajustes (modo maestro)
   Clase · pantalla · seguridad · envío pendiente · fin de curso
   ========================================================= */
window.Ajustes = (function (global) {

  var $ = function (id) { return document.getElementById(id); };

  function abrir() {
    var c = Datos.clase;
    var otras = Datos.clases.length > 1
      ? '<label for="ajClase">Clase activa</label><select class="campo" id="ajClase">' +
          Datos.clases.map(function (x) { return '<option value="' + x.id + '"' + (x.id === c.id ? ' selected' : '') + '>' + App.esc(x.nombre) + '</option>'; }).join('') +
        '</select>'
      : '';
    /* Rejilla de 3 × 2: arriba, la clase y cómo se usa; abajo, cuenta
       y datos. Todos los bloques igual de altos y con los botones al pie. */
    $('pAjustes').innerHTML =
      '<div class="panel-cab"><h2>Ajustes</h2></div>' +
      '<div class="ajustes">' +

      '<section class="bloque"><h3>🏫 La clase</h3>' +
        (otras ? '<div class="aj-campo">' + otras + '</div>' : '') +
        '<div class="dos-col">' +
          '<div><label for="ajNombre">Nombre</label><input class="campo" id="ajNombre" maxlength="60" value="' + App.esc(c.nombre) + '"></div>' +
          '<div><label for="ajCurso">Curso escolar</label><input class="campo" id="ajCurso" maxlength="20" value="' + App.esc(c.curso_escolar) + '"></div>' +
          '<div><label for="ajUmbral">Umbral por defecto (%)</label><input class="campo" id="ajUmbral" type="number" min="1" max="100" value="' + c.umbral_defecto_pct + '"></div>' +
          '<div><label for="ajPuntos">Puntos al bote por defecto</label><input class="campo" id="ajPuntos" type="number" min="0" max="100" value="' + c.puntos_grupo_defecto + '"></div>' +
        '</div>' +
        '<p class="tenue">El umbral y los puntos se usan al crear objetivos nuevos.</p>' +
        '<div class="botones pie"><button class="btn principal" id="ajGuardar">Guardar</button>' +
        '<button class="btn" id="ajNueva">➕ Otra clase</button></div>' +
      '</section>' +

      '<section class="bloque"><h3>⭐ Puntos y trimestres</h3>' +
        (Datos.faltaEsquema
          ? '<p class="aviso mal">Falta ejecutar otra vez supabase/esquema.sql en Supabase.</p>'
          : '<div class="aj-fila"><label for="ajPorSi">Puntos por cada «sí» al votar</label>' +
              '<input class="campo campo-corto" id="ajPorSi" type="number" min="0" max="10" value="' + (c.puntos_por_si == null ? 1 : c.puntos_por_si) + '"></div>' +
            '<label class="interruptor grande"><input type="checkbox" id="ajPuntosPizarra"' + (Datos.verPuntos().mostrar ? ' checked' : '') + '><i></i>' +
              '<span>Enseñar sus puntos al votar <small>Nunca se ve un número negativo. Solo en este ordenador.</small></span></label>' +
            '<div class="aj-chips" id="ajVerPuntos">' +
              [['total', 'Total'], ['semana', 'Semana'], ['mes', 'Mes'], ['trimestre', 'Trimestre'], ['saldo', 'Saldo para premios']].map(function (o) {
                return '<label class="chip-check"><input type="checkbox" data-ver="' + o[0] + '"' + (Datos.verPuntos()[o[0]] ? ' checked' : '') + '><span>' + o[1] + '</span></label>';
              }).join('') +
            '</div>' +
            '<div class="dos-col">' +
              '<div><label for="ajT2">Empieza el 2.º trimestre</label><input class="campo" id="ajT2" type="date" value="' + (c.trimestre2_inicio || '') + '"></div>' +
              '<div><label for="ajT3">Empieza el 3.º trimestre</label><input class="campo" id="ajT3" type="date" value="' + (c.trimestre3_inicio || '') + '"></div>' +
            '</div>' +
            '<p class="tenue">Vacías: 1 de enero y 1 de abril. El 1.er trimestre empieza el 1 de septiembre. Se guarda al cambiarlas.</p>') +
      '</section>' +

      '<section class="bloque"><h3>🖥️ Pantalla y sonido</h3>' +
        '<label class="interruptor grande"><input type="checkbox" id="ajSonido"' + (Sonido.activar() ? ' checked' : '') + '><i></i>' +
          '<span>Sonido <small>Clics, aciertos y celebraciones. Solo en este ordenador.</small></span></label>' +
        '<label class="interruptor grande"><input type="checkbox" id="ajMusica"' + (Sonido.musicaActivar() ? ' checked' : '') + '><i></i>' +
          '<span>Música de fondo <small>Inicio, autoevaluación y modo maestro. Solo en este ordenador.</small></span></label>' +
        '<label class="interruptor grande"><input type="checkbox" id="ajAnim"' + (c.animaciones_reducidas ? ' checked' : '') + '><i></i>' +
          '<span>Animaciones reducidas <small>Sin confeti ni movimientos. Para toda la clase.</small></span></label>' +
        '<label class="interruptor grande"><input type="checkbox" id="ajEscala"' + (Escala.activar() ? ' checked' : '') + '><i></i>' +
          '<span>Escala fija <small id="ajEscalaNota">' + Escala.texto() + '</small></span></label>' +
      '</section>' +

      '<section class="bloque"><h3>👤 Cuenta</h3>' +
        '<p class="tenue">Sesión abierta como <b>' + App.esc((Nube.usuario() || {}).usuario || '') + '</b>' +
          (Nube.esAdmin() ? ' (administrador)' : '') + '. El modo maestro se cierra solo tras 5 minutos sin tocar nada; ' +
          'para salir de la cuenta, «Cerrar sesión» arriba.</p>' +
        (Nube.esAdmin() ? '<div class="botones pie"><button class="btn principal" id="ajUsuarios">👥 Gestionar usuarios</button></div>' : '') +
      '</section>' +

      '<section class="bloque"><h3>☁️ Envío a la nube</h3>' +
        '<p id="ajCola" class="aj-estado"></p>' +
        '<p class="tenue">Las respuestas se guardan primero en este ordenador y se envían solas.</p>' +
        '<div class="botones pie"><button class="btn" id="ajEnviar">Enviar ahora</button></div>' +
      '</section>' +

      '<section class="bloque peligro-zona"><h3>📦 Fin de curso</h3>' +
        '<p class="tenue">Descarga una copia con todo lo de la clase y después bórralo de la nube.</p>' +
        '<div class="botones pie"><button class="btn" id="ajExportar">⬇ Exportar los datos</button>' +
        '<button class="btn peligro" id="ajBorrar">🗑 Borrar el curso</button></div>' +
      '</section>' +

      '</div>';

    if ($('ajClase')) $('ajClase').onchange = function () {
      var id = this.value;
      App.cargando(true);
      Datos.elegirClase(id).then(function () { App.cargando(false); App.aplicarClase(); abrir(); },
        function (e) { App.cargando(false); App.aviso(e.message, 'mal'); });
    };
    $('ajGuardar').onclick = guardar;
    $('ajNueva').onclick = nuevaClase;
    $('ajAnim').onchange = function () {
      var v = this.checked;
      Datos.guardarClase({ animaciones_reducidas: v }).then(App.aplicarClase, function (e) { App.aviso(e.message, 'mal'); abrir(); });
    };
    if ($('ajPuntosPizarra')) {
      $('ajPuntosPizarra').onchange = function () {
        Datos.verPuntos({ mostrar: this.checked });
        $('ajVerPuntos').classList.toggle('apagado', !this.checked);
        App.aviso('Guardado');
      };
      $('ajVerPuntos').classList.toggle('apagado', !Datos.verPuntos().mostrar);
      $('ajVerPuntos').onchange = function (e) {
        var cambio = {}; cambio[e.target.getAttribute('data-ver')] = e.target.checked;
        Datos.verPuntos(cambio);
      };
      $('ajPorSi').onchange = function () {
        var v = Math.round(+this.value);
        if (!(v >= 0 && v <= 10)) { App.aviso('De 0 a 10', 'mal'); this.value = Datos.clase.puntos_por_si; return; }
        Datos.guardarClase({ puntos_por_si: v }).then(function () {
          App.aviso(v ? 'Cada «sí» suma ' + v + (v === 1 ? ' punto' : ' puntos') : 'Los «sí» ya no suman puntos individuales');
        }, function (er) { App.aviso(er.message, 'mal'); });
      };
      ['ajT2', 'ajT3'].forEach(function (id) {
        $(id).onchange = function () {
          var campos = {};
          campos[id === 'ajT2' ? 'trimestre2_inicio' : 'trimestre3_inicio'] = this.value || null;
          Datos.guardarClase(campos).then(function () { App.aviso('Guardado'); }, function (e) { App.aviso(e.message, 'mal'); abrir(); });
        };
      });
    }
    $('ajMusica').onchange = function () { Sonido.musicaActivar(this.checked); };
    $('ajEscala').onchange = function () { Escala.activar(this.checked); Sonido.click(); };
    $('ajSonido').onchange = function () { Sonido.activar(this.checked); Sonido.click(); };
    if ($('ajUsuarios')) $('ajUsuarios').onclick = function () { Sonido.click(); Usuarios.abrir(); };
    $('ajEnviar').onclick = function () { Cola.vaciar().then(pintarCola); };
    $('ajExportar').onclick = exportar;
    $('ajBorrar').onclick = borrarTodo;
    pintarCola();
  }

  function pintarCola() {
    var el = $('ajCola');
    if (!el) return;
    var e = Cola.estado();
    el.textContent = e.pendientes
      ? e.pendientes + ' cambios esperando a enviarse' + (e.fallo === 'red' ? ' (sin conexión: se reintenta solo).' : '.')
      : 'Todo está enviado ✓';
  }
  document.addEventListener('cola', pintarCola);

  function guardar() {
    var campos = {
      nombre: $('ajNombre').value.trim().slice(0, 60),
      curso_escolar: $('ajCurso').value.trim().slice(0, 20),
      umbral_defecto_pct: Math.round(+$('ajUmbral').value),
      puntos_grupo_defecto: Math.round(+$('ajPuntos').value)
    };
    if (!campos.nombre) { App.aviso('La clase necesita un nombre', 'mal'); return; }
    if (!(campos.umbral_defecto_pct >= 1 && campos.umbral_defecto_pct <= 100)) { App.aviso('El umbral va de 1 a 100', 'mal'); return; }
    if (!(campos.puntos_grupo_defecto >= 0 && campos.puntos_grupo_defecto <= 100)) { App.aviso('Los puntos van de 0 a 100', 'mal'); return; }
    Datos.guardarClase(campos).then(function () { App.aplicarClase(); App.aviso('Guardado'); },
      function (e) { App.aviso(e.message, 'mal'); });
  }

  function nuevaClase() {
    Dialogo.pedir({ titulo: 'Otra clase', texto: 'Tendrá su propio alumnado, objetivos, bote y premios.', campo: true,
      pista: 'p. ej. 6º B', aceptar: 'Crear', comprobar: function (v) { return v.trim() ? '' : 'Escribe un nombre.'; } })
      .then(function (v) {
        if (v === null) return;
        return Datos.crearClase(v.trim().slice(0, 60), Datos.clase.curso_escolar).then(function () {
          App.aplicarClase();
          App.aviso('Clase creada. Ahora estás en ella.');
          abrir();
        });
      }).catch(function (e) { App.aviso(e.message, 'mal'); });
  }

  function salir() {
    Dialogo.confirmar('¿Cerrar la sesión?', 'Para volver a entrar harán falta el usuario y la contraseña.', 'Cerrar sesión')
      .then(function (si) {
        if (!si) return;
        var e = Cola.estado();
        var sigue = e.pendientes
          ? Dialogo.confirmar('Hay cambios sin enviar', 'Quedan ' + e.pendientes + ' cambios sin llegar a la nube. Si cierras la sesión, se enviarán la próxima vez que entres con este usuario en este ordenador.', 'Cerrar igualmente')
          : Promise.resolve(true);
        return sigue.then(function (ok) { if (ok) App.cerrarSesion(); });
      });
  }

  function descargar(nombre, texto) {
    var blob = new Blob([texto], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function nombreArchivo() {
    var c = Datos.clase;
    return ('classmojo-' + c.nombre + '-' + (c.curso_escolar || Datos.hoy()))
      .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9-]+/g, '-').replace(/-+/g, '-') + '.json';
  }

  function exportar() {
    Sonido.click();
    App.cargando(true, 'Preparando la copia…');
    return Datos.exportar().then(function (d) {
      App.cargando(false);
      descargar(nombreArchivo(), JSON.stringify(d, null, 2));
      App.aviso('Copia descargada');
      return true;
    }, function (e) {
      App.cargando(false);
      Dialogo.avisar('No se ha podido exportar', e.message);
      return false;
    });
  }

  function borrarTodo() {
    var c = Datos.clase;
    Dialogo.pedir({
      titulo: '¿Borrar todos los datos de ' + c.nombre + '?',
      texto: 'Se borra de la nube la clase entera: alumnado, objetivos, sesiones, respuestas y bote. No se puede deshacer. ' +
             'Antes se descargará una copia. Para confirmar, escribe el nombre de la clase.',
      campo: true, pista: c.nombre, aceptar: 'Descargar copia y borrar', peligro: true,
      comprobar: function (v) { return v.trim() === c.nombre ? '' : 'Escribe exactamente: ' + c.nombre; }
    }).then(function (v) {
      if (v === null) return;
      return exportar().then(function (ok) {
        if (!ok) return;
        App.cargando(true, 'Borrando…');
        return Datos.borrarClase().then(function () {
          App.cargando(false);
          App.aviso('Datos del curso borrados');
          App.trasBorrarClase();
        });
      });
    }).catch(function (e) { App.cargando(false); Dialogo.avisar('No se ha podido borrar', e.message); });
  }

  return { abrir: abrir, salir: salir };

})(window);
