/* =========================================================
   Usuarios (solo el administrador = la primera cuenta creada)
   Ventana desde Ajustes ▸ Cuenta: ver las cuentas, crear otras,
   ponerles una contraseña nueva y borrarlas. Lo hacen funciones de
   la base de datos que comprueban que quien llama es el admin; la
   web solo las usa (ver supabase/esquema.sql, «USUARIOS»).
   ========================================================= */
window.Usuarios = (function () {

  var $ = function (id) { return document.getElementById(id); };
  var PATRON = /^[a-z0-9][a-z0-9._-]{2,19}$/;

  function rpc(nombre, args) {
    return Nube.db.rpc(nombre, args).then(function (r) { if (r.error) throw Nube.fallo(r.error); return r.data; });
  }

  function fecha(iso) {
    return iso ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'nunca';
  }

  function capa() {
    var c = $('capaUsuarios');
    if (c) return c;
    c = document.createElement('div');
    c.className = 'capa';
    c.id = 'capaUsuarios';
    c.innerHTML = '<div class="caja caja-ancha caja-izq caja-usuarios">' +
      '<h2>👥 Usuarios</h2>' +
      '<p class="sub">Cada cuenta ve solo sus clases. Entran con su usuario y contraseña; no hace falta correo.</p>' +
      '<form class="usu-nuevo" id="usForm" autocomplete="off" novalidate>' +
        '<div><label for="usUsuario">Usuario nuevo</label><input class="campo" id="usUsuario" maxlength="20" autocapitalize="none" spellcheck="false" placeholder="p. ej. laura.p"></div>' +
        '<div><label for="usClave">Contraseña</label><input class="campo" id="usClave" type="text" maxlength="72" placeholder="8 caracteres como mínimo"></div>' +
        '<button type="submit" class="btn principal" id="usCrear">➕ Crear</button>' +
      '</form>' +
      '<p class="tenue">Usuario: de 3 a 20 letras sin tildes ni ñ, números, punto o guion. Apunta la contraseña y dásela a esa persona.</p>' +
      '<p class="aviso mal oculto" id="usMal"></p>' +
      '<div class="filas lista-usu" id="usLista"></div>' +
      '<div class="botones capa-pie"><button class="btn" id="usCerrar">Cerrar</button></div>' +
    '</div>';
    document.body.appendChild(c);
    $('usCerrar').onclick = function () { Sonido.click(); c.classList.remove('ver'); };
    c.addEventListener('mousedown', function (e) { if (e.target === c) c.classList.remove('ver'); });
    $('usUsuario').addEventListener('input', function () {
      var v = this.value, limpio = v.toLowerCase().replace(/\s+/g, '');
      if (v !== limpio) this.value = limpio;
    });
    $('usForm').onsubmit = function (e) { e.preventDefault(); crear(); };
    $('usLista').onclick = clicLista;
    return c;
  }

  function mal(t) { var m = $('usMal'); m.textContent = t || ''; m.classList.toggle('oculto', !t); }

  function abrir() {
    capa().classList.add('ver');
    mal('');
    cargar();
    setTimeout(function () { $('usUsuario').focus(); }, 60);
  }

  function cargar() {
    $('usLista').innerHTML = '<div class="cargando-linea"><div class="spinner mini"></div> Cargando…</div>';
    rpc('admin_usuarios').then(pintar, function (e) {
      $('usLista').innerHTML = '<p class="aviso mal">' + App.esc(e.message) + '</p>';
    });
  }

  function pintar(lista) {
    $('usLista').innerHTML = (lista || []).map(function (u) {
      return '<div class="fila-usu" data-id="' + u.id + '" data-usuario="' + App.esc(u.usuario) + '">' +
        '<span class="usu-nombre">' + App.esc(u.usuario) + (u.es_admin ? ' <span class="etq verde">admin</span>' : '') + '</span>' +
        '<span class="tenue">Alta: ' + fecha(u.creado) + '</span>' +
        '<span class="tenue">Último acceso: ' + fecha(u.ultimo_acceso) + '</span>' +
        '<span class="tenue">' + u.clases + (u.clases === 1 ? ' clase' : ' clases') + '</span>' +
        '<span class="usu-acciones">' +
          '<button class="btn mini-btn" data-acc="clave">🔑 Contraseña nueva</button>' +
          (u.es_admin ? '' : '<button class="mini peligro-suave" data-acc="borrar" title="Borrar la cuenta">🗑</button>') +
        '</span>' +
      '</div>';
    }).join('');
  }

  function crear() {
    var u = $('usUsuario').value.trim().toLowerCase(), c = $('usClave').value;
    if (!PATRON.test(u)) return mal('Usuario no válido: de 3 a 20 letras sin tildes ni ñ, números, punto o guion.');
    if (c.length < 8) return mal('La contraseña necesita al menos 8 caracteres.');
    mal('');
    $('usCrear').disabled = true;
    rpc('admin_crear_usuario', { p_usuario: u, p_clave: c }).then(function () {
      Sonido.si();
      App.aviso('Cuenta «' + u + '» creada');
      $('usUsuario').value = ''; $('usClave').value = '';
      cargar();
    }, function (e) { mal(e.message); })
      .then(function () { $('usCrear').disabled = false; });
  }

  function clicLista(e) {
    var b = e.target.closest('[data-acc]'); if (!b) return;
    var fila = b.closest('.fila-usu'), id = fila.getAttribute('data-id'), usuario = fila.getAttribute('data-usuario');
    Sonido.click();
    if (b.getAttribute('data-acc') === 'clave') {
      Dialogo.pedir({
        titulo: '🔑 Contraseña nueva para ' + usuario, texto: 'Escríbela y dásela. La anterior deja de valer.',
        campo: true, pista: '8 caracteres como mínimo', aceptar: 'Cambiarla',
        comprobar: function (v) { return v.length < 8 ? 'Al menos 8 caracteres.' : v.length > 72 ? 'Como mucho 72 caracteres.' : ''; }
      }).then(function (v) {
        if (v === null) return;
        return rpc('admin_cambiar_clave', { p_id: id, p_clave: v }).then(function () { App.aviso('Contraseña cambiada'); });
      }).catch(function (er) { mal(er.message); });
    } else {
      Dialogo.confirmar('¿Borrar la cuenta «' + usuario + '»?',
        'Se borran también TODAS sus clases, con su alumnado, sesiones, puntos y canjes. No se puede deshacer.',
        'Borrar la cuenta', true).then(function (si) {
        if (!si) return;
        return rpc('admin_borrar_usuario', { p_id: id }).then(function () { App.aviso('Cuenta borrada'); cargar(); });
      }).catch(function (er) { mal(er.message); });
    }
  }

  return { abrir: abrir };

})();
