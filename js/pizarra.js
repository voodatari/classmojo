/* =========================================================
   Pizarra · lo que ve la clase
   Inicio → Elegir objetivo → Autoevaluación → Resultado

   Reglas que no se rompen aquí (ESPEC §2):
   · En la pizarra solo hay totales de clase. Ningún resultado
     individual, ninguna lista de alumnos en el resultado.
   · «Hoy no» es neutro: solo el clic, sin rojo, sin animación.
   · «¡Lo conseguí!» celebra: menos de 1 s, sonido de acierto.
   · La autoevaluación alimenta el bote de grupo, no puntos
     individuales.
   ========================================================= */
window.Pizarra = (function (global) {

  var $ = function (id) { return document.getElementById(id); };
  var AVANCE_MS = 600;

  /* ======================= INICIO ======================= */
  function inicio() {
    var c = Datos.clase;
    $('inClase').textContent = c.nombre;
    $('inCurso').textContent = c.curso_escolar || '';
    pintarBote($('inBote'), $('inCifras'), Datos.bote, false);
    var aviso = $('inAviso');
    if (!Datos.alumnosActivos().length) {
      aviso.textContent = 'Aún no hay alumnado: entra en el modo maestro (🔒) e impórtalo desde Séneca.';
      aviso.classList.remove('oculto');
    } else if (!Datos.objetivosActivos().length) {
      aviso.textContent = 'No hay objetivos activos: actívalos en el modo maestro.';
      aviso.classList.remove('oculto');
    } else aviso.classList.add('oculto');
    App.ir('inicio');
    Datos.actualizarBote().then(function (b) {
      if (App.vista() === 'inicio') pintarBote($('inBote'), $('inCifras'), b, false);
    }).catch(function (e) { console.warn(e); });
  }

  function pintarBote(numEl, cifrasEl, b, tres) {
    numEl.textContent = b.total;
    var cifras = [['Hoy', b.hoy], ['Esta semana', b.semana]];
    if (tres) cifras.push(['Total', b.total]);
    cifrasEl.innerHTML = cifras.map(function (c) {
      return '<div class="cifra"><b>' + c[1] + '</b><span>' + c[0] + '</span></div>';
    }).join('');
  }

  /* Cuenta hacia arriba (o pone el número sin más si no hay animaciones) */
  function contar(el, desde, hasta) {
    if (!App.animar() || desde === hasta) { el.textContent = hasta; return; }
    var t0 = performance.now(), dur = 900;
    (function paso(t) {
      var k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(desde + (hasta - desde) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(paso);
    })(t0);
  }

  /* ======================= ELEGIR OBJETIVO ======================= */
  var estadoHoy = {};   // objetivo_id → 'hecho' | 'medias'

  function elegir() {
    if (!Datos.alumnosActivos().length || !Datos.objetivosActivos().length) {
      Dialogo.avisar('Falta preparar la clase', !Datos.alumnosActivos().length
        ? 'Primero hay que importar el alumnado (modo maestro ▸ Alumnado).'
        : 'No hay ningún objetivo activo (modo maestro ▸ Objetivos).');
      return;
    }
    calcularEstadoHoy(sesionesDeHoyLocales());
    pintarObjetivos();
    App.ir('elegir');
    /* se mira también el servidor por si se hizo desde otro ordenador */
    Datos.sesionesDelDia(Datos.hoy(), false).then(function (r) {
      calcularEstadoHoy(r.sesiones);
      if (App.vista() === 'elegir') pintarObjetivos();
    }).catch(function (e) { console.warn(e); });
  }

  function sesionesDeHoyLocales() {
    var mapa = {};
    try { mapa = JSON.parse(localStorage.getItem('classmojo.sesiones.' + Datos.clase.id) || '{}'); } catch (e) {}
    return Object.keys(mapa).map(function (k) { return mapa[k]; })
      .filter(function (s) { return s.fecha === Datos.hoy(); });
  }

  function calcularEstadoHoy(sesiones) {
    estadoHoy = {};
    sesiones.forEach(function (s) {
      if (s.anulada) return;
      if (s.cerrada_at) estadoHoy[s.objetivo_id] = { tipo: 'hecho', sesion: s.id };
      else if (!estadoHoy[s.objetivo_id]) estadoHoy[s.objetivo_id] = { tipo: 'medias', sesion: s.id };
    });
  }

  function pintarObjetivos() {
    $('elLista').innerHTML = Datos.objetivosActivos().map(function (o, i) {
      var e = estadoHoy[o.id];
      var marca = e ? '<span class="marca-hoy">' + (e.tipo === 'hecho' ? '✓ Hecho hoy' : '▶ A medias') + '</span>' : '';
      return '<button class="tarjeta-obj' + (e && e.tipo === 'hecho' ? ' hecho' : '') + '" data-id="' + o.id + '" style="--c:' + o.color + ';--i:' + i + '">' +
        marca + Iconos.html(o.icono, 'ico-obj') +
        /* arriba la descripción corta; debajo el detalle (sin descripción, el detalle arriba) */
        '<b>' + App.esc(o.descripcion || o.titulo) + '</b>' +
        (o.descripcion ? '<span class="obj-detalle" data-texto="' + App.esc(o.titulo) + '">' + App.esc(o.titulo) + '</span>' : '') +
      '</button>';
    }).join('');
    ajustarTarjetas();
  }

  /* Tarjetas lo más grandes posible sin que haga falta desplazar */
  function ajustarTarjetas() {
    var lista = $('elLista'), n = lista.children.length;
    if (!n) return;
    var w = lista.clientWidth, h = lista.clientHeight, mejor = 1, mejorLado = 0;
    for (var cols = 1; cols <= n; cols++) {
      var filas = Math.ceil(n / cols);
      var lado = Math.min((w - (cols - 1) * 18) / cols, ((h - (filas - 1) * 18) / filas) * 1.25);
      if (lado > mejorLado) { mejorLado = lado; mejor = cols; }
    }
    lista.style.setProperty('--cols', mejor);
    Array.prototype.forEach.call(lista.querySelectorAll('.obj-detalle'), repartirDetalle);
  }
  global.addEventListener('resize', function () { if (App.vista() === 'elegir') ajustarTarjetas(); });
  /* la tipografía puede llegar después de pintar: entonces se vuelve a medir */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (App.vista() === 'elegir') ajustarTarjetas(); });

  /* El detalle de una tarjeta nunca es más ancho que la descripción corta
     de encima: si no cabe, va en varias líneas, cada una igual o más
     corta que la anterior (de mayor a menor) y lo más equilibradas posible.
     Si una sola palabra ya es más ancha, la letra del detalle se reduce un poco. */
  function repartirDetalle(s) {
    var b = s.parentNode.querySelector('b');
    var texto = s.getAttribute('data-texto') || '';
    var palabras = texto.split(/\s+/).filter(Boolean);
    s.style.fontSize = '';
    s.style.whiteSpace = 'nowrap';
    s.textContent = texto;
    if (!b || !palabras.length) return;

    /* ancho de la línea más larga de la descripción (puede ocupar varias) */
    var r = document.createRange();
    r.selectNodeContents(b);
    var W = 0;
    Array.prototype.forEach.call(r.getClientRects(), function (x) { W = Math.max(W, x.width); });
    if (!W) return;

    /* medidor invisible con la misma letra que el detalle */
    var m = document.createElement('span');
    m.className = 'obj-detalle';
    m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:0;top:0;pointer-events:none';
    s.parentNode.appendChild(m);
    var cache = {};
    function ancho(t) {
      if (cache[t] === undefined) { m.textContent = t; cache[t] = m.getBoundingClientRect().width; }
      return cache[t];
    }
    /* reparte con la primera línea como mucho de L y cada una como mucho
       tan larga como la anterior; ok si todas caben bajo W y van de mayor a menor */
    function partir(L) {
      var lineas = [], tope = L, cur = '';
      palabras.forEach(function (p) {
        var cand = cur ? cur + ' ' + p : p;
        if (!cur || ancho(cand) <= tope + 0.5) cur = cand;
        else { lineas.push(cur); tope = Math.min(tope, ancho(cur)); cur = p; }
      });
      lineas.push(cur);
      var ok = lineas.every(function (l, i) {
        return ancho(l) <= W + 0.5 && (i === 0 || ancho(l) <= ancho(lineas[i - 1]) + 0.5);
      });
      return { lineas: lineas, ok: ok };
    }

    var tam = parseFloat(getComputedStyle(s).fontSize), mejor = partir(W);
    while (!mejor.ok && tam > 11) {          // alguna palabra no cabe: letra un poco más pequeña
      tam *= 0.92;
      s.style.fontSize = m.style.fontSize = tam + 'px';
      cache = {};
      mejor = partir(W);
    }
    if (mejor.lineas.length > 1) {
      /* el mismo número de líneas, pero lo más equilibradas posible */
      var n = mejor.lineas.length, lo = 0, hi = W;
      for (var k = 0; k < 14; k++) {
        var mid = (lo + hi) / 2, p = partir(mid);
        if (p.ok && p.lineas.length === n) { hi = mid; mejor = p; } else lo = mid;
      }
    }
    m.remove();
    s.innerHTML = mejor.lineas.map(App.esc).join('<br>');
  }

  function alElegir(id) {
    Sonido.click();
    var e = estadoHoy[id];
    if (e && e.tipo === 'hecho') {
      Dialogo.confirmar('Hoy ya se ha hecho: ¿repetir?',
        'Si lo repetís, el resultado de antes deja de contar para el bote (se puede ver en Revisión).',
        'Sí, repetir').then(function (si) {
        if (!si) return;
        Datos.anularSesion(e.sesion);
        empezar(Datos.empezarSesion(id));
      });
      return;
    }
    if (e && e.tipo === 'medias') {
      var s = Datos.sesionLocal(e.sesion);
      if (s) { App.aviso('Seguimos donde lo dejamos'); empezar(s); return; }
      Datos.anularSesion(e.sesion);   // empezada en otro ordenador: se empieza de nuevo aquí
    }
    empezar(Datos.empezarSesion(id));
  }

  /* ======================= AUTOEVALUACIÓN ======================= */
  var A = null;   // {sesion, objetivo, orden, i, historial, timer}

  function empezar(sesion) {
    var orden = Datos.alumnosActivos().slice();
    var hechos = orden.filter(function (a) { return sesion.respuestas[a.id]; });
    A = { sesion: sesion, objetivo: Datos.objetivo(sesion.objetivo_id), orden: orden, i: 0,
          historial: hechos.map(function (a) { return a.id; }), timer: null };
    A.i = siguienteSinResponder(0);
    totalesAuto = Datos.totales();
    /* los puntos de los «sí» anteriores los crea la base de datos: se
       piden al empezar y, cuando llegan, se repinta al alumno de turno */
    Datos.refrescarPuntos().then(function (ok) {
      if (!ok || !A || App.vista() !== 'auto') return;
      totalesAuto = Datos.totales();
      if (A.orden[A.i]) pintarPuntosAlumno(A.orden[A.i]);
    });
    var o = A.objetivo;
    $('auObj').innerHTML = Iconos.html(o.icono, 'ico-auto') + '<b>' + App.esc(o.titulo) + '</b>';
    $('auObj').style.setProperty('--c', o.color);
    if (A.i >= orden.length) { terminar(); return; }
    App.ir('auto');
    pintarAlumno(false);
  }

  function siguienteSinResponder(desde) {
    for (var i = desde; i < A.orden.length; i++) if (!A.sesion.respuestas[A.orden[i].id]) return i;
    return A.orden.length;
  }

  function pintarAlumno(entrar) {
    var a = A.orden[A.i];
    $('auAvatar').innerHTML = Avatares.html(a.avatar, 'avatar-auto');
    $('auNombre').textContent = a.nombre_visible;
    pintarPuntosAlumno(a);
    pintarFila();
    $('auCuenta').textContent = (A.i + 1) + ' de ' + A.orden.length;
    $('auBarra').style.width = (A.historial.length / A.orden.length * 100) + '%';
    ['auSi', 'auNo', 'auAusente'].forEach(function (id) { $(id).classList.remove('pulsado'); $(id).disabled = false; });
    $('auAtras').disabled = !A.historial.length;
    var c = $('auCentro');
    c.classList.remove('celebra');
    if (entrar && App.animar()) FX.repetir(c, 'entra-alumno', 260);
  }

  /* Puntos individuales del alumno (solo si está activado en Ajustes).
     En la pizarra nunca se enseña un número negativo: se queda en 0. */
  var totalesAuto = null;
  function pintarPuntosAlumno(a) {
    var el = $('auPuntos');
    var ver = Datos.verPuntos();
    var t = (totalesAuto || {})[a.id] || { semana: 0, mes: 0, trimestre: 0, total: 0, saldo: 0 };
    var n = function (x) { return Math.max(0, x); };
    var cifras = [];
    if (ver.total) cifras.push([t.total, 'en total']);
    if (ver.semana) cifras.push([t.semana, 'esta semana']);
    if (ver.mes) cifras.push([t.mes, 'este mes']);
    if (ver.trimestre) cifras.push([t.trimestre, 'este trimestre']);
    if (ver.saldo) cifras.push([t.saldo, 'para premios']);
    if (!ver.mostrar || !cifras.length) { el.classList.add('oculto'); return; }
    el.classList.toggle('uno', cifras.length === 1);
    el.innerHTML = Iconos.html('estrella', 'ico-pts') + cifras.map(function (c) {
      return '<span><b>' + n(c[0]) + '</b> ' + c[1] + '</span>';
    }).join('');
    el.classList.remove('oculto');
  }

  /* Lista de la fila (si está activada en Ajustes): todos en el orden de
     la clase, el de turno marcado y los que ya han pasado atenuados.
     Nunca dice qué contestó cada uno: el «sí», el «no» y el «no ha
     venido» se ven igual. La lista se monta una vez por votación y en
     cada cambio solo se desliza la banda blanca hasta el de turno. Si no
     caben, se desplaza para que el de turno quede a la vista.
     turnoEn: a quién marcar (por defecto, el de turno). Al responder se
     llama ya con el siguiente, para que la banda baje en cuanto se pulsa. */
  function pintarFila(turnoEn) {
    var actual = turnoEn === undefined ? A.i : turnoEn;
    var el = $('auFila');
    if (!Datos.verFila()) { el.classList.add('oculto'); el.innerHTML = ''; el.removeAttribute('data-sesion'); return; }
    var nueva = el.getAttribute('data-sesion') !== A.sesion.id || el.querySelectorAll('li').length !== A.orden.length;
    el.classList.remove('oculto');
    if (nueva) {
      el.setAttribute('data-sesion', A.sesion.id);
      el.innerHTML = '<span class="fila-marca quieta" aria-hidden="true"></span>' + A.orden.map(function (a, i) {
        return '<li><span class="fila-n">' + (i + 1) + '</span><span class="fila-nombre">' + App.esc(a.nombre_visible) + '</span></li>';
      }).join('');
      /* letra según cuántos son y el alto que hay */
      var alto = el.clientHeight || 400;
      el.style.setProperty('--fila-alto', Math.max(18, Math.min(44, Math.floor((alto - 16) / A.orden.length) - 2)) + 'px');
    }
    var filas = el.querySelectorAll('li');
    Array.prototype.forEach.call(filas, function (li, i) {
      li.classList.toggle('turno', i === actual);
      li.classList.toggle('hecho', i !== actual && !!A.sesion.respuestas[A.orden[i].id]);
    });
    var turno = filas[actual], marca = el.querySelector('.fila-marca');
    if (!turno) { marca.style.opacity = '0'; return; }
    marca.style.opacity = '';
    /* al montar la lista (o con animaciones reducidas) la banda aparece ya en su sitio */
    marca.classList.toggle('quieta', nueva || !App.animar());
    marca.style.height = turno.offsetHeight + 'px';
    marca.style.transform = 'translateY(' + turno.offsetTop + 'px)';
    if (nueva) requestAnimationFrame(function () { marca.classList.remove('quieta'); });
    if (el.scrollHeight > el.clientHeight) {
      el.scrollTop = turno.offsetTop - el.clientHeight / 2 + turno.offsetHeight / 2;
    }
  }

  function responder(resp) {
    if (!A || A.timer || A.i >= A.orden.length || App.vista() !== 'auto') return;
    var a = A.orden[A.i];
    Datos.responder(A.sesion.id, a.id, resp);
    A.sesion = Datos.sesionLocal(A.sesion.id);
    A.historial.push(a.id);
    pintarFila(siguienteSinResponder(A.i + 1));   // la banda baja ya, sin esperar al siguiente
    $('auBarra').style.width = (A.historial.length / A.orden.length * 100) + '%';
    $('auAtras').disabled = false;
    var boton = $(resp === 'si' ? 'auSi' : resp === 'no' ? 'auNo' : 'auAusente');
    boton.classList.add('pulsado');
    ['auSi', 'auNo', 'auAusente'].forEach(function (id) { if ($(id) !== boton) $(id).disabled = true; });

    if (resp === 'si') {
      Sonido.si();
      if (App.animar()) {
        FX.repetir($('auCentro'), 'celebra', 700);
        FX.desde($('auAvatar'), 34);
      }
    } else {
      Sonido.click();   // «Hoy no» y «No ha venido»: solo el clic
    }
    A.timer = setTimeout(avanzar, AVANCE_MS);
  }

  function avanzar() {
    A.timer = null;
    A.i = siguienteSinResponder(A.i + 1);
    if (A.i >= A.orden.length) { terminar(); return; }
    pintarAlumno(true);
  }

  /* Deshace la última respuesta y vuelve a ese alumno */
  function atras() {
    if (!A || !A.historial.length) return;
    Sonido.click();
    if (A.timer) { clearTimeout(A.timer); A.timer = null; }
    var id = A.historial.pop();
    Datos.deshacer(A.sesion.id, id);
    A.sesion = Datos.sesionLocal(A.sesion.id);
    A.i = A.orden.map(function (a) { return a.id; }).indexOf(id);
    if (A.i < 0) A.i = siguienteSinResponder(0);
    pintarAlumno(true);
  }

  function salir() {
    if (A && A.timer) { clearTimeout(A.timer); A.timer = null; }
    Dialogo.confirmar('¿Salir de la autoevaluación?',
      'Lo contestado se guarda. Si volvéis a elegir este objetivo hoy, se sigue donde se quedó.',
      'Salir').then(function (si) {
      if (si) { A = null; inicio(); }
      else if (A && A.i < A.orden.length && A.sesion.respuestas[A.orden[A.i].id]) avanzar();
    });
  }

  /* ======================= RESULTADO ======================= */
  function terminar() {
    var antes = Datos.bote;
    Datos.cerrarSesion(A.sesion.id);
    A.sesion = Datos.sesionLocal(A.sesion.id);
    var r = Datos.recuento(A.sesion);
    var o = A.objetivo;

    /* el bote de antes + lo de ahora, sin esperar a la red */
    var despues = { hoy: antes.hoy + r.puntos, semana: antes.semana + r.puntos, total: antes.total + r.puntos };

    $('reObj').innerHTML = Iconos.html(o.icono, 'ico-res') + '<b>' + App.esc(o.titulo) + '</b>';
    $('reObj').style.setProperty('--c', o.color);
    if (r.presentes) {
      $('reTexto').innerHTML = '<b>' + r.si + '</b> de <b>' + r.presentes + '</b> lo han conseguido';
      $('rePct').textContent = r.pct + ' %';
    } else {
      $('reTexto').textContent = 'Hoy no ha habido respuestas';
      $('rePct').textContent = '';
    }
    var vista = $('vResultado');
    vista.classList.toggle('conseguido', r.conseguido);
    if (r.conseguido) {
      $('reMensaje').innerHTML = Iconos.html('fiesta', 'ico-msg') + '<span>¡Objetivo conseguido! <b>+' + r.puntos + '</b> al bote</span>';
    } else {
      $('reMensaje').innerHTML = Iconos.html('brote', 'ico-msg') + '<span>¡Mañana otro!</span>';
    }
    pintarBote($('inBote'), $('reCifras'), despues, true);
    App.ir('resultado');
    /* suena hasta que se sale de esta pantalla: celebración si se ha
       conseguido; si no, una música tranquila y animosa (nunca triste) */
    Sonido.musica(r.conseguido ? 'exito' : 'animo');

    if (r.conseguido) {
      if (App.animar()) {
        FX.repetir($('reMensaje'), 'pop', 900);
        FX.lluvia(150);
        var nums = $('reCifras').querySelectorAll('b');
        contar(nums[0], antes.hoy, despues.hoy);
        contar(nums[1], antes.semana, despues.semana);
        contar(nums[2], antes.total, despues.total);
      }
    }
    Datos.actualizarBote().then(function (b) {
      if (App.vista() === 'resultado') pintarBote($('inBote'), $('reCifras'), b, true);
    }).catch(function (e) { console.warn(e); });
  }

  /* «Atrás» en el resultado: se reabre la sesión y se vuelve al último */
  function atrasDesdeResultado() {
    if (!A || !A.historial.length) return;
    Sonido.parar();
    FX.apagar();
    Datos.cerrarSesion(A.sesion.id, false);
    A.sesion = Datos.sesionLocal(A.sesion.id);
    Datos.actualizarBote().catch(function () {});
    App.ir('auto');
    atras();
  }

  /* ======================= EVENTOS ======================= */
  function conectar() {
    $('inBoteIco').innerHTML = Iconos.html('bote', 'ico-bote');
    $('inObjIco').innerHTML = Iconos.html('estrella', 'ico-boton');
    $('inCandado').innerHTML = Iconos.html('candado', 'ico-candado');
    $('auSiIco').innerHTML = Iconos.html('sonrisa');
    $('auNoIco').innerHTML = Iconos.html('brote');

    $('inObjetivo').onclick = function () { Sonido.click(); elegir(); };
    $('inCandado').onclick = function () { Sonido.click(); App.entrarMaestro(); };
    $('elVolver').onclick = function () { Sonido.click(); inicio(); };
    $('elLista').onclick = function (e) {
      var b = e.target.closest('.tarjeta-obj');
      if (b) alElegir(b.getAttribute('data-id'));
    };
    $('auSi').onclick = function () { responder('si'); };
    $('auNo').onclick = function () { responder('no'); };
    $('auAusente').onclick = function () { responder('ausente'); };
    $('auAtras').onclick = atras;
    $('auSalir').onclick = function () { Sonido.click(); salir(); };
    $('reInicio').onclick = function () { Sonido.click(); Sonido.parar(); FX.apagar(); A = null; inicio(); };
    $('reAtras').onclick = atrasDesdeResultado;

    /* atajos del maestro: S sí, N no, A ausente, Retroceso atrás */
    document.addEventListener('keydown', function (e) {
      if (App.vista() !== 'auto' || e.ctrlKey || e.altKey || e.metaKey) return;
      if (document.querySelector('.capa.ver')) return;
      var k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); responder('si'); }
      else if (k === 'n') { e.preventDefault(); responder('no'); }
      else if (k === 'a') { e.preventDefault(); responder('ausente'); }
      else if (e.key === 'Backspace') { e.preventDefault(); atras(); }
    });
  }

  return { conectar: conectar, inicio: inicio };

})(window);
