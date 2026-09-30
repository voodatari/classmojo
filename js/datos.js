/* =========================================================
   Datos · clase, alumnado, objetivos, sesiones y bote
   ---------------------------------------------------------
   · Lo que se usa en la pizarra (clase, alumnos, objetivos) se
     guarda también en el navegador: si la red va lenta o se cae,
     la app arranca con lo último que tenía.
   · Las sesiones de autoevaluación viven primero en el navegador
     (classmojo.sesiones.<clase>) y se envían con la Cola. El
     resultado de la pantalla final se calcula aquí mismo; la base
     de datos lo vuelve a calcular por su cuenta al recibirlo.
   · Las ediciones del modo maestro (alumnado, objetivos, ajustes)
     van directas a Supabase y avisan si no hay red.
   ========================================================= */
window.Datos = (function (global) {

  var CLASE_CAMPOS = 'id, nombre, curso_escolar, pin_hash, umbral_defecto_pct, puntos_grupo_defecto, puntos_indiv_por_si, animaciones_reducidas, mostrar_puntos, trimestre2_inicio, trimestre3_inicio, puntos_por_si, created_at';
  var CLASE_CAMPOS_V1 = 'id, nombre, curso_escolar, pin_hash, umbral_defecto_pct, puntos_grupo_defecto, puntos_indiv_por_si, animaciones_reducidas, created_at';
  var CONDUCTA_CAMPOS = 'id, clase_id, nombre, icono, color, puntos, tipo, orden, activa';
  var RECOMPENSA_CAMPOS = 'id, clase_id, nombre, icono, color, nivel, precio, activa, orden';
  var PUNTO_CAMPOS = 'id, alumno_id, conducta_id, autoevaluacion_id, puntos, fecha, nota, created_at';
  var CANJE_CAMPOS = 'id, alumno_id, recompensa_id, nombre, precio, fecha, created_at';
  var ALUMNO_CAMPOS = 'id, clase_id, nombre_visible, orden, avatar, activo';
  var OBJETIVO_CAMPOS = 'id, clase_id, titulo, descripcion, icono, color, umbral_pct, puntos_grupo, orden, activo';
  var SESION_CAMPOS = 'id, clase_id, objetivo_id, fecha, iniciada_at, cerrada_at, umbral_pct, puntos_posibles, presentes, si, no, ausentes, conseguido, puntos_grupo, anulada';
  var DIAS_LOCALES = 21;   // las sesiones del navegador se olvidan pasadas tres semanas

  var st = { clases: [], clase: null, alumnos: [], objetivos: [], bote: { hoy: 0, semana: 0, total: 0 },
             conductas: [], recompensas: [], puntos: [], canjes: [], faltaEsquema: false };

  /* ¿Falta ejecutar la parte nueva de esquema.sql? (tablas o columnas nuevas) */
  function esFaltaEsquema(err) {
    var e = (err && err.original) || err || {};
    var m = String(e.message || '');
    return /does not exist|schema cache|Could not find/i.test(m) ||
      ['42P01', '42703', 'PGRST204', 'PGRST205'].indexOf(e.code) >= 0;
  }

  /* ---------------- utilidades ---------------- */
  function db() { return Nube.db; }
  function uid() { var u = Nube.usuario(); return u ? u.id : 'nadie'; }
  function leerLS(k, porDefecto) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : porDefecto; } catch (e) { return porDefecto; }
  }
  function guardarLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function borrarLS(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function nuevoId() {
    if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function dos(n) { return (n < 10 ? '0' : '') + n; }
  function isoDe(d) { return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate()); }
  function hoy() { return isoDe(new Date()); }
  function lunesDe(iso) {
    var p = iso.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
    var dia = (d.getDay() + 6) % 7;          // lunes = 0
    d.setDate(d.getDate() - dia);
    return isoDe(d);
  }
  function sumarDias(iso, n) {
    var p = iso.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() + n);
    return isoDe(d);
  }

  function lanzar(r) { if (r.error) throw Nube.fallo(r.error); return r.data; }

  /* ---------------- caché de la pizarra ---------------- */
  function kCache() { return 'classmojo.cache.' + uid(); }
  function guardarCache() {
    guardarLS(kCache(), { clases: st.clases, claseId: st.clase && st.clase.id, alumnos: st.alumnos, objetivos: st.objetivos,
      conductas: st.conductas, recompensas: st.recompensas, puntos: st.puntos, canjes: st.canjes });
  }
  function leerCache() { return leerLS(kCache(), null); }

  /* ---------------- carga ---------------- */
  /* Devuelve {sinRed: bool}. Si no hay red y hay caché, tira de ella. */
  function cargar() {
    st.faltaEsquema = false;
    return db().from('clases').select(CLASE_CAMPOS).order('created_at')
      .then(function (r) {
        /* base de datos aún sin la parte nueva del esquema: se sigue con lo de antes */
        if (r.error && esFaltaEsquema(r.error)) { st.faltaEsquema = true; return db().from('clases').select(CLASE_CAMPOS_V1).order('created_at'); }
        return r;
      })
      .then(lanzar)
      .then(function (clases) {
        st.clases = clases || [];
        var c = leerCache();
        var id = c && c.claseId;
        var elegida = st.clases.filter(function (x) { return x.id === id; })[0] || st.clases[0] || null;
        return elegirClase(elegida ? elegida.id : null);
      })
      .then(function () { return { sinRed: false }; })
      .catch(function (err) {
        var c = leerCache();
        if (!Nube.esDeRed(err.original || err) || !c) throw err;
        st.clases = c.clases || [];
        st.clase = st.clases.filter(function (x) { return x.id === c.claseId; })[0] || null;
        st.alumnos = c.alumnos || [];
        st.objetivos = c.objetivos || [];
        st.conductas = c.conductas || []; st.recompensas = c.recompensas || [];
        st.puntos = c.puntos || []; st.canjes = c.canjes || [];
        st.bote = leerLS(kBote(), st.bote);
        return { sinRed: true };
      });
  }

  function elegirClase(id) {
    st.clase = st.clases.filter(function (x) { return x.id === id; })[0] || null;
    st.alumnos = []; st.objetivos = []; st.conductas = []; st.recompensas = []; st.puntos = []; st.canjes = [];
    if (!st.clase) { guardarCache(); return Promise.resolve(); }
    st.bote = leerLS(kBote(), { hoy: 0, semana: 0, total: 0 });
    return Promise.all([
      db().from('alumnos').select(ALUMNO_CAMPOS).eq('clase_id', id).order('orden').order('nombre_visible').then(lanzar),
      db().from('objetivos').select(OBJETIVO_CAMPOS).eq('clase_id', id).order('orden').then(lanzar)
    ]).then(function (r) {
      st.alumnos = r[0] || [];
      st.objetivos = r[1] || [];
      return cargarPuntos(id);
    }).then(function () { guardarCache(); });
  }

  /* Conductas, premios, puntos y canjes. Si la base aún no tiene esas
     tablas, se sigue sin ellas y se avisa en el modo maestro. */
  function cargarPuntos(id) {
    if (st.faltaEsquema) return Promise.resolve();
    return Promise.all([
      db().from('conductas').select(CONDUCTA_CAMPOS).eq('clase_id', id).order('orden').then(lanzar),
      db().from('recompensas').select(RECOMPENSA_CAMPOS).eq('clase_id', id).order('orden').then(lanzar),
      traerTodo('puntos', PUNTO_CAMPOS, id),
      traerTodo('canjes', CANJE_CAMPOS, id)
    ]).then(function (r) {
      st.conductas = r[0] || []; st.recompensas = r[1] || [];
      st.puntos = r[2]; st.canjes = r[3];
    }, function (err) {
      if (!esFaltaEsquema(err)) throw err;
      st.faltaEsquema = true;
    });
  }

  /* PostgREST devuelve como mucho 1000 filas por petición: se pide por páginas */
  function traerTodo(tabla, campos, claseId) {
    var todo = [], paso = 1000;
    function pagina(desde) {
      return db().from(tabla).select(campos).eq('clase_id', claseId).order('created_at').range(desde, desde + paso - 1)
        .then(lanzar).then(function (filas) {
          todo = todo.concat(filas || []);
          return filas && filas.length === paso ? pagina(desde + paso) : todo;
        });
    }
    return pagina(0);
  }

  /* ---------------- clases ---------------- */
  function crearClase(nombre, curso) {
    return db().from('clases').insert({ nombre: nombre, curso_escolar: curso || '' }).select(CLASE_CAMPOS).single()
      .then(lanzar)
      .then(function (c) { st.clases.push(c); return elegirClase(c.id).then(function () { return c; }); });
  }

  function guardarClase(campos) {
    return db().from('clases').update(campos).eq('id', st.clase.id).select(CLASE_CAMPOS).single()
      .then(lanzar)
      .then(function (c) {
        st.clases = st.clases.map(function (x) { return x.id === c.id ? c : x; });
        st.clase = c;
        guardarCache();
        return c;
      });
  }

  /* Borra la clase entera: alumnado, objetivos, sesiones y respuestas. */
  function borrarClase() {
    var id = st.clase.id;
    return db().from('clases').delete().eq('id', id).then(lanzar).then(function () {
      borrarLS(kSesiones(id)); borrarLS('classmojo.bote.' + id);
      st.clases = st.clases.filter(function (x) { return x.id !== id; });
      return elegirClase(st.clases[0] ? st.clases[0].id : null);
    });
  }

  /* Todo lo de la clase en un JSON, para guardarlo antes de borrar. */
  function exportar() {
    var id = st.clase.id;
    return Cola.vaciada().then(function () {
      return Promise.all([
        db().from('clases').select(CLASE_CAMPOS).eq('id', id).single().then(lanzar),
        db().from('alumnos').select(ALUMNO_CAMPOS).eq('clase_id', id).order('orden').then(lanzar),
        db().from('objetivos').select(OBJETIVO_CAMPOS).eq('clase_id', id).order('orden').then(lanzar),
        db().from('sesiones').select(SESION_CAMPOS).eq('clase_id', id).order('fecha').then(lanzar),
        st.faltaEsquema ? [] : db().from('conductas').select(CONDUCTA_CAMPOS).eq('clase_id', id).order('orden').then(lanzar),
        st.faltaEsquema ? [] : db().from('recompensas').select(RECOMPENSA_CAMPOS).eq('clase_id', id).order('orden').then(lanzar),
        st.faltaEsquema ? [] : traerTodo('puntos', PUNTO_CAMPOS, id),
        st.faltaEsquema ? [] : traerTodo('canjes', CANJE_CAMPOS, id)
      ]);
    }).then(function (r) {
      var ids = r[3].map(function (s) { return s.id; });
      var trozos = [];
      for (var i = 0; i < ids.length; i += 150) trozos.push(ids.slice(i, i + 150));
      return Promise.all(trozos.map(function (t) {
        return db().from('autoevaluaciones').select('sesion_id, alumno_id, respuesta, revisada, respondida_at, revisada_at')
          .in('sesion_id', t).then(lanzar);
      })).then(function (partes) {
        var clase = r[0]; delete clase.pin_hash;
        return {
          app: 'ClassMojo', exportado: new Date().toISOString(),
          clase: clase, alumnos: r[1], objetivos: r[2], sesiones: r[3],
          autoevaluaciones: [].concat.apply([], partes),
          conductas: r[4], recompensas: r[5], puntos: r[6], canjes: r[7]
        };
      });
    });
  }

  /* ---------------- alumnado ---------------- */
  function alumnosActivos() { return st.alumnos.filter(function (a) { return a.activo; }); }

  function ordenar(lista) {
    return lista.sort(function (a, b) { return (a.orden - b.orden) || a.nombre_visible.localeCompare(b.nombre_visible, 'es'); });
  }

  function insertarAlumnos(filas) {
    if (!filas.length) return Promise.resolve([]);
    filas.forEach(function (f) { f.clase_id = st.clase.id; });
    return db().from('alumnos').insert(filas).select(ALUMNO_CAMPOS).then(lanzar).then(function (nuevos) {
      st.alumnos = ordenar(st.alumnos.concat(nuevos));
      guardarCache();
      return nuevos;
    });
  }

  function guardarAlumno(id, campos) {
    return db().from('alumnos').update(campos).eq('id', id).select(ALUMNO_CAMPOS).single().then(lanzar)
      .then(function (a) {
        st.alumnos = ordenar(st.alumnos.map(function (x) { return x.id === a.id ? a : x; }));
        guardarCache();
        return a;
      });
  }

  function borrarAlumno(id) {
    return db().from('alumnos').delete().eq('id', id).then(lanzar).then(function () {
      st.alumnos = st.alumnos.filter(function (x) { return x.id !== id; });
      guardarCache();
    });
  }

  /* Guarda el orden nuevo: solo se envían los que cambian. */
  function reordenar(tabla, lista) {
    var cambios = [];
    lista.forEach(function (x, i) { if (x.orden !== i + 1) { x.orden = i + 1; cambios.push(x); } });
    guardarCache();
    return Promise.all(cambios.map(function (x) {
      return db().from(tabla).update({ orden: x.orden }).eq('id', x.id).then(lanzar);
    }));
  }

  /* ---------------- objetivos ---------------- */
  function objetivosActivos() { return st.objetivos.filter(function (o) { return o.activo; }); }
  function objetivo(id) { return st.objetivos.filter(function (o) { return o.id === id; })[0] || null; }

  function guardarObjetivo(id, campos) {
    var q = id
      ? db().from('objetivos').update(campos).eq('id', id)
      : db().from('objetivos').insert(Object.assign({ clase_id: st.clase.id }, campos));
    return q.select(OBJETIVO_CAMPOS).single().then(lanzar).then(function (o) {
      if (id) st.objetivos = st.objetivos.map(function (x) { return x.id === o.id ? o : x; });
      else st.objetivos.push(o);
      st.objetivos.sort(function (a, b) { return a.orden - b.orden; });
      guardarCache();
      return o;
    });
  }

  /* ---------------- sesiones (primero en el navegador) ---------------- */
  function kSesiones(claseId) { return 'classmojo.sesiones.' + (claseId || (st.clase && st.clase.id)); }
  function sesionesLocales() { return leerLS(kSesiones(), {}); }
  function guardarSesionesLocales(mapa) {
    var limite = sumarDias(hoy(), -DIAS_LOCALES);
    Object.keys(mapa).forEach(function (id) { if (mapa[id].fecha < limite) delete mapa[id]; });
    guardarLS(kSesiones(), mapa);
  }
  function sesionLocal(id) { return sesionesLocales()[id] || null; }
  function tocarSesion(s) {
    var mapa = sesionesLocales();
    mapa[s.id] = s;
    guardarSesionesLocales(mapa);
    return s;
  }

  /* Recuento igual que el de la base de datos (recontar_sesion). */
  function recuento(s) {
    var r = { si: 0, no: 0, ausentes: 0 };
    Object.keys(s.respuestas || {}).forEach(function (k) {
      var v = s.respuestas[k];
      if (v === 'si') r.si++; else if (v === 'no') r.no++; else if (v === 'ausente') r.ausentes++;
    });
    r.presentes = r.si + r.no;
    r.pct = r.presentes ? Math.round(r.si * 100 / r.presentes) : 0;
    r.conseguido = r.presentes > 0 && r.si * 100 >= s.umbral_pct * r.presentes;
    r.puntos = r.conseguido ? s.puntos_posibles : 0;
    return r;
  }

  function opSesion(s) {
    return {
      t: 'upsert', tabla: 'sesiones', conflicto: 'id', clave: 'ses:' + s.id, sesion: s.id,
      fila: {
        id: s.id, clase_id: s.clase_id, objetivo_id: s.objetivo_id, fecha: s.fecha,
        iniciada_at: s.iniciada_at, cerrada_at: s.cerrada_at || null,
        umbral_pct: s.umbral_pct, puntos_posibles: s.puntos_posibles, anulada: !!s.anulada
      }
    };
  }

  function empezarSesion(objetivoId) {
    var o = objetivo(objetivoId);
    var s = tocarSesion({
      id: nuevoId(), clase_id: st.clase.id, objetivo_id: o.id, fecha: hoy(),
      iniciada_at: new Date().toISOString(), cerrada_at: null, anulada: false,
      umbral_pct: o.umbral_pct, puntos_posibles: o.puntos_grupo, respuestas: {}
    });
    Cola.poner(opSesion(s));
    return s;
  }

  function responder(sesionId, alumnoId, respuesta, revisada) {
    var s = sesionLocal(sesionId);
    if (!s) return null;
    s.respuestas[alumnoId] = respuesta;
    tocarSesion(s);
    var ahora = new Date().toISOString();
    var fila = { sesion_id: sesionId, alumno_id: alumnoId, respuesta: respuesta, respondida_at: ahora };
    if (revisada) { fila.revisada = true; fila.revisada_at = ahora; }
    Cola.poner({ t: 'upsert', tabla: 'autoevaluaciones', conflicto: 'sesion_id,alumno_id', fila: fila,
      clave: 'ae:' + sesionId + ':' + alumnoId, sesion: sesionId });
    return s;
  }

  function deshacer(sesionId, alumnoId) {
    var s = sesionLocal(sesionId);
    if (!s) return null;
    delete s.respuestas[alumnoId];
    tocarSesion(s);
    Cola.poner({ t: 'delete', tabla: 'autoevaluaciones', donde: { sesion_id: sesionId, alumno_id: alumnoId },
      clave: 'ae:' + sesionId + ':' + alumnoId, sesion: sesionId });
    return s;
  }

  function cerrarSesion(sesionId, cerrada) {
    var s = sesionLocal(sesionId);
    if (!s) return null;
    s.cerrada_at = cerrada === false ? null : new Date().toISOString();
    tocarSesion(s);
    Cola.poner(opSesion(s));
    return s;
  }

  function anularSesion(sesionId) {
    var s = sesionLocal(sesionId);
    if (s) {
      s.anulada = true;
      tocarSesion(s);
      Cola.poner(opSesion(s));
      return;
    }
    /* sesión que solo está en el servidor (hecha en otro ordenador) */
    Cola.poner({ t: 'update', tabla: 'sesiones', valores: { anulada: true }, donde: { id: sesionId },
      clave: 'anula:' + sesionId, sesion: sesionId });
  }

  /* Borra una valoración entera (la sesión y todas sus respuestas). */
  function borrarSesion(sesionId) {
    var mapa = sesionesLocales();
    delete mapa[sesionId];
    guardarSesionesLocales(mapa);
    Cola.purgar(sesionId);       // lo que aún no había subido ya no hace falta
    Cola.poner({ t: 'delete', tabla: 'sesiones', donde: { id: sesionId }, clave: 'borra:' + sesionId });
  }

  /* Trae una sesión del servidor al navegador (para la revisión). */
  function adoptarSesion(srv, respuestas) {
    var s = sesionLocal(srv.id);
    if (s && Cola.sesionesPendientes()[srv.id]) return s;   // lo del navegador aún no ha subido: manda
    s = {
      id: srv.id, clase_id: srv.clase_id, objetivo_id: srv.objetivo_id, fecha: srv.fecha,
      iniciada_at: srv.iniciada_at, cerrada_at: srv.cerrada_at, anulada: srv.anulada,
      umbral_pct: srv.umbral_pct, puntos_posibles: srv.puntos_posibles, respuestas: respuestas || {}
    };
    return tocarSesion(s);
  }

  /* Sesiones de un día: las del servidor mezcladas con las del navegador.
     Devuelve {sesiones: [...], sinRed}. */
  function sesionesDelDia(fecha, conRespuestas) {
    var locales = sesionesLocales();
    var delDia = function () {
      return Object.keys(locales).map(function (k) { return locales[k]; })
        .filter(function (s) { return s.fecha === fecha && s.clase_id === st.clase.id; });
    };
    return Cola.vaciar().then(function () {
      return db().from('sesiones').select(SESION_CAMPOS).eq('clase_id', st.clase.id).eq('fecha', fecha)
        .order('iniciada_at').then(lanzar);
    }).then(function (srv) {
      if (!conRespuestas || !srv.length) return { srv: srv, aes: [] };
      return db().from('autoevaluaciones').select('sesion_id, alumno_id, respuesta, revisada')
        .in('sesion_id', srv.map(function (s) { return s.id; })).then(lanzar)
        .then(function (aes) { return { srv: srv, aes: aes }; });
    }).then(function (r) {
      var porSesion = {};
      r.aes.forEach(function (a) { (porSesion[a.sesion_id] = porSesion[a.sesion_id] || {})[a.alumno_id] = a.respuesta; });
      var revisadas = {};
      r.aes.forEach(function (a) { if (a.revisada) revisadas[a.sesion_id + ':' + a.alumno_id] = true; });
      r.srv.forEach(function (s) { adoptarSesion(s, conRespuestas ? (porSesion[s.id] || {}) : (locales[s.id] ? locales[s.id].respuestas : {})); });
      locales = sesionesLocales();
      return { sesiones: ordenarSesiones(delDia()), revisadas: revisadas, sinRed: false };
    }).catch(function (err) {
      if (!Nube.esDeRed(err.original || err)) throw err;
      return { sesiones: ordenarSesiones(delDia()), revisadas: {}, sinRed: true };
    });
  }
  function ordenarSesiones(l) { return l.sort(function (a, b) { return a.iniciada_at < b.iniciada_at ? -1 : 1; }); }

  /* ---------------- puntos individuales ---------------- */
  function conductasActivas() { return st.conductas.filter(function (c) { return c.activa; }); }

  /* Da los mismos puntos a varios alumnos. motivo: {conducta_id, puntos, nota} */
  function darPuntos(alumnoIds, motivo) {
    var filas = alumnoIds.map(function (a) {
      return { clase_id: st.clase.id, alumno_id: a, conducta_id: motivo.conducta_id || null,
               puntos: motivo.puntos, nota: (motivo.nota || '').slice(0, 120), fecha: hoy() };
    });
    return db().from('puntos').insert(filas).select(PUNTO_CAMPOS).then(lanzar).then(function (nuevos) {
      st.puntos = st.puntos.concat(nuevos);
      guardarCache();
      return nuevos;
    });
  }

  function borrarPunto(id) { return borrarDe('puntos', id); }

  /* guarda (o crea, si id es null) en conductas o recompensas */
  function guardarEn(tabla, id, campos) {
    var sel = tabla === 'conductas' ? CONDUCTA_CAMPOS : RECOMPENSA_CAMPOS;
    var q = id ? db().from(tabla).update(campos).eq('id', id)
               : db().from(tabla).insert(Object.assign({ clase_id: st.clase.id }, campos));
    return q.select(sel).single().then(lanzar).then(function (x) {
      if (id) st[tabla] = st[tabla].map(function (y) { return y.id === x.id ? x : y; });
      else st[tabla].push(x);
      st[tabla].sort(function (a, b) { return a.orden - b.orden; });
      guardarCache();
      return x;
    });
  }

  function borrarDe(tabla, id) {
    return db().from(tabla).delete().eq('id', id).then(lanzar).then(function () {
      st[tabla] = st[tabla].filter(function (x) { return x.id !== id; });
      guardarCache();
    });
  }

  /* ---------------- premios ---------------- */
  /* alumnoId null = canje colectivo (lo paga el bote). La base de datos
     comprueba el saldo y pone el precio. */
  function canjear(alumnoId, recompensaId) {
    return db().from('canjes').insert({ clase_id: st.clase.id, alumno_id: alumnoId || null, recompensa_id: recompensaId })
      .select(CANJE_CAMPOS).single().then(lanzar).then(function (c) {
        st.canjes.push(c);
        guardarCache();
        return c;
      });
  }

  function deshacerCanje(id) { return borrarDe('canjes', id); }

  /* ---------------- periodos y totales ---------------- */
  /* Curso: desde el 1 de septiembre. Trimestres: el 1.º desde septiembre;
     el 2.º y el 3.º desde las fechas de Ajustes (o 1 de enero y 1 de abril). */
  function periodos() {
    var d = hoy(), y = +d.slice(0, 4), m = +d.slice(5, 7);
    var y0 = m >= 9 ? y : y - 1;
    var curso = y0 + '-09-01';
    var t2 = (st.clase && st.clase.trimestre2_inicio) || (y0 + 1) + '-01-01';
    var t3 = (st.clase && st.clase.trimestre3_inicio) || (y0 + 1) + '-04-01';
    var trimestre = d >= t3 ? t3 : d >= t2 ? t2 : curso;
    return { semana: lunesDe(d), mes: d.slice(0, 8) + '01', trimestre: trimestre, curso: curso };
  }

  /* Vuelve a traer puntos y canjes (los del «sí» los crea la base de
     datos, así que hay que pedirlos). Sin red se queda con lo que tenía. */
  function refrescarPuntos() {
    if (!st.clase || st.faltaEsquema) return Promise.resolve(false);
    var id = st.clase.id;
    return Promise.all([traerTodo('puntos', PUNTO_CAMPOS, id), traerTodo('canjes', CANJE_CAMPOS, id)])
      .then(function (r) {
        if (!st.clase || st.clase.id !== id) return false;
        st.puntos = r[0]; st.canjes = r[1];
        guardarCache();
        return true;
      }, function () { return false; });
  }

  /* «Sí» que aún no han llegado a la base de datos (sin red, o recién
     pulsados): todavía no tienen su apunte, así que se suman aquí. */
  function puntosSiPendientes() {
    var porSi = (st.clase && st.clase.puntos_por_si) || 0, extra = [];
    if (!porSi) return extra;
    var locales = sesionesLocales();
    Cola.pendientes().forEach(function (op) {
      if (op.tabla !== 'autoevaluaciones' || op.t !== 'upsert' || !op.fila || op.fila.respuesta !== 'si') return;
      var s = locales[op.fila.sesion_id];
      if (!s || s.anulada || s.clase_id !== st.clase.id) return;
      extra.push({ alumno_id: op.fila.alumno_id, puntos: porSi, fecha: s.fecha });
    });
    return extra;
  }

  /* {alumno_id: {semana, mes, trimestre, curso, total, gastado, saldo}} */
  function totales() {
    var p = periodos(), t = {};
    st.alumnos.forEach(function (a) { t[a.id] = { semana: 0, mes: 0, trimestre: 0, curso: 0, total: 0, gastado: 0, saldo: 0 }; });
    st.puntos.concat(puntosSiPendientes()).forEach(function (x) {
      var o = t[x.alumno_id]; if (!o) return;
      o.total += x.puntos;
      if (x.fecha >= p.curso) o.curso += x.puntos;
      if (x.fecha >= p.trimestre) o.trimestre += x.puntos;
      if (x.fecha >= p.mes) o.mes += x.puntos;
      if (x.fecha >= p.semana) o.semana += x.puntos;
    });
    st.canjes.forEach(function (c) { var o = c.alumno_id && t[c.alumno_id]; if (o) o.gastado += c.precio; });
    Object.keys(t).forEach(function (k) { t[k].saldo = t[k].total - t[k].gastado; });
    return t;
  }

  /* Qué puntos ve cada alumno al votar. De fábrica: todo encendido menos
     el saldo para premios. Se guarda en este ordenador, para cada clase.
     verPuntos() → la configuración; verPuntos({semana: false}) → cambia. */
  var VER_DEFECTO = { mostrar: true, total: true, semana: true, mes: true, trimestre: true, saldo: false };
  function verPuntos(cambio) {
    var k = 'classmojo.verpuntos2.' + (st.clase && st.clase.id);
    var v = Object.assign({}, VER_DEFECTO, leerLS(k, {}));
    if (cambio === undefined) return v;
    v = Object.assign(v, cambio);
    guardarLS(k, v);
    return v;
  }

  /* ---------------- bote ---------------- */
  function kBote() { return 'classmojo.bote.' + (st.clase && st.clase.id); }

  /* Pide el bote al servidor y le suma lo que aún no ha subido.
     Sin red, parte del último bote conocido. */
  function actualizarBote() {
    if (!st.clase) return Promise.resolve(st.bote);
    var claseId = st.clase.id;
    var lunes = lunesDe(hoy()), viernes = sumarDias(lunes, 4);
    return Cola.vaciar().then(function () {
      return Promise.all([
        db().rpc('resumen_bote', { p_clase: claseId }).then(lanzar),
        db().from('sesiones').select('id, fecha, puntos_grupo, cerrada_at, anulada')
          .eq('clase_id', claseId).gte('fecha', sumarDias(hoy(), -DIAS_LOCALES)).then(lanzar)
      ]);
    }).then(function (r) {
      var base = (r[0] && r[0][0]) || { hoy: 0, semana: 0, total: 0 };
      var servidor = {};
      r[1].forEach(function (s) { servidor[s.id] = (s.cerrada_at && !s.anulada) ? s.puntos_grupo : 0; });
      var b = ajustarConPendientes(base, servidor, lunes, viernes);
      st.bote = b;
      guardarLS(kBote(), { hoy: base.hoy, semana: base.semana, total: base.total, servidor: servidor, dia: hoy() });
      return b;
    }).catch(function (err) {
      if (!Nube.esDeRed(err.original || err)) throw err;
      var c = leerLS(kBote(), null);
      if (!c) return st.bote;
      var base = c.dia === hoy() ? c : { hoy: 0, semana: lunesDe(c.dia || hoy()) === lunes ? c.semana : 0, total: c.total };
      st.bote = ajustarConPendientes(base, c.servidor || {}, lunes, viernes);
      return st.bote;
    });
  }

  /* A lo que dice el servidor se le quita lo que él sabe de cada sesión
     pendiente y se le suma lo que dice el navegador. */
  function ajustarConPendientes(base, servidor, lunes, viernes) {
    var b = { hoy: base.hoy, semana: base.semana, total: base.total };
    var pend = Cola.sesionesPendientes();
    var locales = sesionesLocales();
    var d = hoy();
    Object.keys(pend).forEach(function (id) {
      var s = locales[id];
      if (!s) return;
      var local = (s.cerrada_at && !s.anulada) ? recuento(s).puntos : 0;
      var dif = local - (servidor[id] || 0);
      b.total += dif;
      if (s.fecha === d) b.hoy += dif;
      if (s.fecha >= lunes && s.fecha <= viernes) b.semana += dif;
    });
    return b;
  }

  return {
    get clases() { return st.clases; },
    get clase() { return st.clase; },
    get alumnos() { return st.alumnos; },
    get objetivos() { return st.objetivos; },
    get bote() { return st.bote; },
    get conductas() { return st.conductas; },
    get recompensas() { return st.recompensas; },
    get puntos() { return st.puntos; },
    get canjes() { return st.canjes; },
    get faltaEsquema() { return st.faltaEsquema; },
    hoy: hoy, lunesDe: lunesDe, sumarDias: sumarDias,
    cargar: cargar, elegirClase: elegirClase,
    crearClase: crearClase, guardarClase: guardarClase, borrarClase: borrarClase, exportar: exportar,
    alumnosActivos: alumnosActivos, insertarAlumnos: insertarAlumnos, guardarAlumno: guardarAlumno,
    borrarAlumno: borrarAlumno, reordenar: reordenar,
    objetivosActivos: objetivosActivos, objetivo: objetivo, guardarObjetivo: guardarObjetivo,
    empezarSesion: empezarSesion, responder: responder, deshacer: deshacer,
    cerrarSesion: cerrarSesion, anularSesion: anularSesion, sesionLocal: sesionLocal,
    sesionesDelDia: sesionesDelDia, recuento: recuento, borrarSesion: borrarSesion,
    conductasActivas: conductasActivas, darPuntos: darPuntos, borrarPunto: borrarPunto,
    guardarEn: guardarEn, borrarDe: borrarDe, canjear: canjear, deshacerCanje: deshacerCanje,
    periodos: periodos, totales: totales, verPuntos: verPuntos, refrescarPuntos: refrescarPuntos,
    actualizarBote: actualizarBote
  };

})(window);
