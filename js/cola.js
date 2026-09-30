/* =========================================================
   Cola · guardado que aguanta los cortes de la wifi del centro
   ---------------------------------------------------------
   Cada cambio se apunta primero en localStorage y después se
   envía a Supabase en segundo plano, EN ORDEN. Si falla la red,
   se queda en la cola y se reintenta solo (cada pocos segundos
   y en cuanto el navegador vuelve a tener conexión). La
   autoevaluación nunca espera a la red.

   Operación: {t:'upsert'|'update'|'delete', tabla, fila, conflicto,
               valores, donde, clave}
   · clave: si llega otra operación con la misma clave antes de
     enviarse la anterior, la nueva la sustituye (p. ej. corregir
     la respuesta de un alumno dos veces seguidas).
   · Si un envío falla por algo que no es la red (una regla, un
     dato que ya no existe), se descarta: reintentarlo no lo
     arreglaría y bloquearía todo lo demás.
   ========================================================= */
window.Cola = (function (global) {

  var K = 'classmojo.cola';
  var REINTENTO = 8000;
  var enviando = false;
  var ultimoFallo = null;
  var temporizador = null;

  function leer() {
    try { return JSON.parse(localStorage.getItem(K) || '[]'); } catch (e) { return []; }
  }
  function guardar(lista) {
    try { localStorage.setItem(K, JSON.stringify(lista)); } catch (e) {}
    avisar();
  }
  function avisar() {
    try { document.dispatchEvent(new CustomEvent('cola', { detail: estado() })); } catch (e) {}
  }

  function yo() { var u = global.Nube && Nube.usuario(); return u ? u.id : null; }

  function mias(lista) {
    var id = yo();
    return lista.filter(function (op) { return op.u === id; });
  }

  function estado() {
    return { pendientes: mias(leer()).length, enviando: enviando, fallo: ultimoFallo };
  }

  function poner(op) {
    op.u = yo();
    op.n = Date.now() + Math.random();
    var lista = leer();
    var sitio = -1;
    if (op.clave) {
      /* La nueva ocupa EL SITIO de la anterior con la misma clave, no el
         final: si «crear la sesión» se fuera detrás de sus respuestas,
         estas llegarían antes que su sesión y se rechazarían.
         La que se está enviando (la primera, si hay envío en marcha) no
         se toca: la nueva va al final y llega después. */
      lista = lista.filter(function (o, i) {
        var misma = o.clave === op.clave && o.u === op.u && !(enviando && i === 0);
        if (misma && sitio < 0) { sitio = i; return true; }
        return !misma;
      });
    }
    if (sitio >= 0) lista[sitio] = op;
    else lista.push(op);
    guardar(lista);
    vaciar();
  }

  function ejecutar(op) {
    var db = Nube.db;
    var q;
    if (op.t === 'upsert') q = db.from(op.tabla).upsert(op.fila, op.conflicto ? { onConflict: op.conflicto } : undefined);
    else if (op.t === 'update') q = db.from(op.tabla).update(op.valores).match(op.donde);
    else if (op.t === 'delete') q = db.from(op.tabla).delete().match(op.donde);
    else return Promise.resolve();
    return q.then(function (r) { if (r.error) throw r.error; });
  }

  /* Envía todo lo pendiente, una operación detrás de otra. */
  function vaciar() {
    if (enviando || !Nube.configurada || !yo()) return Promise.resolve(estado());
    var lista = leer();
    var siguiente = lista.filter(function (o) { return o.u === yo(); })[0];
    if (!siguiente) { ultimoFallo = null; avisar(); return Promise.resolve(estado()); }

    /* las operaciones de este usuario van delante (para poder
       quitar la primera sin mirar índices ajenos) */
    var propias = mias(lista), ajenas = lista.filter(function (o) { return o.u !== yo(); });
    guardar(propias.concat(ajenas));

    enviando = true;
    avisar();
    return ejecutar(siguiente).then(function () {
      quitar(siguiente.n);
      ultimoFallo = null;
      enviando = false;
      return vaciar();
    }, function (err) {
      enviando = false;
      if (Nube.esDeRed(err)) {
        ultimoFallo = 'red';
        avisar();
        programar();
        return estado();
      }
      console.warn('Cola: se descarta una operación que la base de datos rechaza', siguiente, err);
      quitar(siguiente.n);
      ultimoFallo = null;
      return vaciar();
    });
  }

  function quitar(n) {
    guardar(leer().filter(function (o) { return o.n !== n; }));
  }

  function programar() {
    if (temporizador) return;
    temporizador = setTimeout(function () { temporizador = null; vaciar(); }, REINTENTO);
  }

  /* Espera a que la cola quede vacía (o a que falle la red). */
  function vaciada() {
    return vaciar().then(function () {
      if (!enviando) return estado();
      return new Promise(function (ok) {
        function mirar(e) {
          if (!e.detail.enviando) { document.removeEventListener('cola', mirar); ok(e.detail); }
        }
        document.addEventListener('cola', mirar);
      });
    });
  }

  global.addEventListener('online', function () { vaciar(); });
  setInterval(function () { if (mias(leer()).length) vaciar(); }, REINTENTO * 2);

  /* ids de las sesiones que aún tienen algo sin enviar */
  function sesionesPendientes() {
    var s = {};
    mias(leer()).forEach(function (o) { if (o.sesion) s[o.sesion] = true; });
    return s;
  }

  /* Quita lo pendiente de una sesión (al borrarla entera). La que se
     esté enviando no se toca. */
  function purgar(sesionId) {
    guardar(leer().filter(function (o, i) { return !(o.sesion === sesionId && !(enviando && i === 0)); }));
  }

  /* operaciones de este usuario aún sin enviar (solo para leer) */
  function pendientes() { return mias(leer()); }

  return { poner: poner, purgar: purgar, pendientes: pendientes, vaciar: vaciar, vaciada: vaciada, estado: estado, sesionesPendientes: sesionesPendientes };

})(window);
