/* =========================================================
   Nube · conexión con Supabase y cuenta del maestro
   ---------------------------------------------------------
   Basado en el de Juegos de aula, pero SIN registro: las cuentas
   las crea el administrador en Supabase (registro desactivado).
   · Se entra con usuario y contraseña. Supabase necesita un
     correo, así que se usa uno interno que nadie lee:
     «usuario@usuarios.classmojo.invalid».
   · La sesión se guarda en localStorage si se marca «Mantener
     la sesión» (lo normal en el ordenador del aula) y, si no,
     en sessionStorage (se cierra con el navegador).
   ========================================================= */
window.Nube = (function (global) {

  var cfg = global.CONFIG || {};
  var K_RECORDAR = 'classmojo.recordar';

  var configurada = !!(cfg.SUPABASE_URL && /^https?:\/\//.test(cfg.SUPABASE_URL) &&
    !/TU-PROYECTO/.test(cfg.SUPABASE_URL) &&
    cfg.SUPABASE_CLAVE && !/PEGA-AQUI/.test(cfg.SUPABASE_CLAVE) &&
    global.supabase && global.supabase.createClient);

  function recordar(v) {
    try {
      if (v === undefined) return localStorage.getItem(K_RECORDAR) !== '0';
      localStorage.setItem(K_RECORDAR, v ? '1' : '0');
    } catch (e) { return true; }
  }

  /* almacén de la sesión: decide sesión corta o larga */
  var almacen = {
    getItem: function (k) {
      try { return sessionStorage.getItem(k) || localStorage.getItem(k); } catch (e) { return null; }
    },
    setItem: function (k, v) {
      try {
        if (recordar()) { localStorage.setItem(k, v); sessionStorage.removeItem(k); }
        else { sessionStorage.setItem(k, v); localStorage.removeItem(k); }
      } catch (e) {}
    },
    removeItem: function (k) {
      try { sessionStorage.removeItem(k); localStorage.removeItem(k); } catch (e) {}
    }
  };

  /* Con la wifi del centro, una petición puede quedarse colgada
     minutos. A los 12 s se corta y cuenta como fallo de red: la Cola
     la reintentará y la pantalla no se queda esperando. */
  var LIMITE_MS = 12000;
  function fetchConLimite(url, op) {
    if (!global.AbortController) return fetch(url, op);
    var ctl = new AbortController();
    op = Object.assign({}, op);
    if (op.signal) op.signal.addEventListener('abort', function () { ctl.abort(); });
    op.signal = ctl.signal;
    var t = setTimeout(function () { ctl.abort(); }, LIMITE_MS);
    return fetch(url, op).then(function (r) { clearTimeout(t); return r; },
      function (e) { clearTimeout(t); throw new TypeError('Failed to fetch (' + (e && e.name) + ')'); });
  }

  var db = null;
  if (configurada) {
    try {
      db = global.supabase.createClient(cfg.SUPABASE_URL.replace(/\/+$/, ''), cfg.SUPABASE_CLAVE, {
        global: { fetch: fetchConLimite },
        auth: {
          storage: almacen,
          storageKey: 'classmojo.sesion',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      });
    } catch (e) { configurada = false; db = null; }
  }

  var yo = null;   // {id, usuario}
  var admin = false;

  /* ¿Es la cuenta administradora (la primera que se creó)? Lo dice la
     base de datos; si aún no tiene esa función, se entiende que no. */
  function comprobarAdmin() {
    if (!db || !yo) { admin = false; return Promise.resolve(false); }
    return db.rpc('soy_admin').then(function (r) { admin = !r.error && r.data === true; return admin; },
      function () { admin = false; return false; });
  }

  function deUsuario(user) {
    if (!user) return null;
    return { id: user.id, usuario: String(user.email || '').split('@')[0] };
  }

  /* Recupera la sesión guardada. Sin red también funciona: Supabase
     devuelve la sesión del almacén aunque no pueda refrescarla. */
  function iniciar() {
    if (!configurada) return Promise.resolve(null);
    db.auth.onAuthStateChange(function (evento, sesion) {
      if (evento === 'SIGNED_OUT') { yo = null; admin = false; avisar(); }
      else if (sesion && sesion.user) yo = deUsuario(sesion.user);
    });
    return db.auth.getSession()
      .then(function (r) {
        yo = deUsuario(r.data && r.data.session && r.data.session.user);
        if (!yo && r.error && esDeRed(r.error)) yo = guardada();
        return yo;
      })
      .catch(function (e) { yo = esDeRed(e) ? guardada() : null; return yo; });
  }

  /* Sin red por la mañana, Supabase no puede renovar la sesión y la
     da por perdida. Si hay una guardada, se usa su usuario para
     trabajar con la caché; al volver la red se renueva sola. */
  function guardada() {
    try {
      var s = JSON.parse(almacen.getItem('classmojo.sesion') || 'null');
      return s && s.user ? deUsuario(s.user) : null;
    } catch (e) { return null; }
  }

  function avisar() {
    try { document.dispatchEvent(new CustomEvent('cuenta', { detail: yo })); } catch (e) {}
  }

  /* ---------------- mensajes de error en castellano ---------------- */
  function traducir(err) {
    var m = String((err && (err.message || err.error_description || err.msg)) || err || '');
    var code = err && (err.code || err.error_code) || '';
    if (/invalid login credentials|invalid_credentials/i.test(m + code)) return 'Usuario o contraseña incorrectos.';
    if (/email not confirmed|email_not_confirmed/i.test(m + code)) return 'La cuenta está sin confirmar: al crearla en Supabase marca «Auto Confirm User».';
    if (/rate limit|too many|over_request_rate_limit/i.test(m + code)) return 'Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.';
    if (/failed to fetch|networkerror|load failed|network/i.test(m)) return 'No hay conexión con la base de datos. Revisa internet (o el filtro de la red del centro).';
    if (/jwt|permission denied|42501/i.test(m + code)) return 'No tienes permiso para hacer eso. Vuelve a entrar con tu usuario.';
    if (/does not exist|schema cache/i.test(m)) return 'Falta preparar la base de datos: ejecuta supabase/esquema.sql en Supabase.';
    return m || 'Error desconocido';
  }
  function fallo(err) { var e = new Error(traducir(err)); e.original = err; return e; }

  /* ¿El fallo es de red (reintentar luego) o de datos (no insistir)? */
  function esDeRed(err) {
    if (!err) return false;
    if (global.navigator && navigator.onLine === false) return true;
    var m = String(err.message || err) + ' ' + (err.details || '');
    return /failed to fetch|networkerror|load failed|network|timeout|fetch/i.test(m) ||
      err.status === 0 || err.status >= 500 || err.code === 'PGRST301' || /jwt expired/i.test(m);
  }

  function correo(usuario) {
    var u = String(usuario || '').trim().toLowerCase();
    return u.indexOf('@') >= 0 ? u : u + '@' + (cfg.DOMINIO_USUARIOS || 'usuarios.classmojo.invalid');
  }

  function entrar(usuario, clave, mantener) {
    if (!configurada) return Promise.reject(new Error('La web aún no está conectada a Supabase (falta rellenar js/config.js).'));
    if (!String(usuario || '').trim()) return Promise.reject(new Error('Escribe tu usuario.'));
    if (!clave) return Promise.reject(new Error('Escribe la contraseña.'));
    recordar(!!mantener);
    return db.auth.signInWithPassword({ email: correo(usuario), password: String(clave) })
      .then(function (r) {
        if (r.error) throw r.error;
        yo = deUsuario(r.data.user);
        avisar();
        return yo;
      })
      .catch(function (e) { throw fallo(e); });
  }

  function salir() {
    if (!configurada) return Promise.resolve();
    return db.auth.signOut().catch(function () {})
      .then(function () {
        yo = null;
        admin = false;
        almacen.removeItem('classmojo.sesion');
        avisar();
      });
  }

  return {
    get configurada() { return configurada; },
    get db() { return db; },
    iniciar: iniciar,
    usuario: function () { return yo; },
    esAdmin: function () { return admin; },
    comprobarAdmin: comprobarAdmin,
    entrar: entrar,
    salir: salir,
    recordar: recordar,
    traducir: traducir,
    fallo: fallo,
    esDeRed: esDeRed
  };

})(window);
