# ClassMojo · el bote de la clase

App web de **refuerzo positivo para el aula**: la clase se autoevalúa cada día en un objetivo de grupo y, si lo consigue, suma puntos a un bote común. Además lleva puntos individuales por conducta y una tienda de premios. Nace como alternativa propia a ClassDojo para una clase de 5.º de Primaria.

**Web:** https://voodatari.github.io/classmojo/

> El acceso es **privado**: no hay registro abierto. Las cuentas las crea la persona administradora.

## Cómo se usa

La app tiene dos modos, porque se usa en la pizarra digital delante de la clase.

### Modo pizarra (lo que ve la clase)

- **Inicio**: nombre de la clase y puntos del bote en grande, y el botón **Objetivo de hoy**.
- **Elegir objetivo**: tarjetas con los objetivos activos (por ejemplo, «Aula recogida antes de la sirena»).
- **Autoevaluación**: va saliendo cada alumno con su avatar y responde **¡Lo conseguí!** o **Hoy no**. También se puede marcar **No ha venido** o deshacer con **Atrás**. Atajos de teclado: `S`, `N`, `A` y `Retroceso`.
- **Resultado**: solo totales de la clase («20 de 23, 87 %»). Si se supera el umbral (80 % por defecto), hay celebración y puntos al bote.

### Modo maestro (protegido, tras el candado)

- **Revisión**: corregir respuestas de cualquier día; el resultado y el bote se recalculan solos.
- **Puntos**: dar puntos individuales por conductas configurables a uno o varios alumnos, ver totales por semana, mes, trimestre y curso, y un historial donde se pueden quitar apuntes (de uno en uno o varios a la vez) o reiniciar los puntos de un alumno o de toda la clase.
- **Premios**: catálogo de premios individuales y colectivos, canjes con comprobación de saldo y deshacer canjes.
- **Alumnado**: importación desde el PDF de Séneca (sin fotos), orden de la lista, avatares tipo «monstruito» y altas y bajas.
- **Objetivos**: crear, ordenar y desactivar objetivos, con su umbral y sus puntos.
- **Ajustes**: clase, trimestres, sonido y música, animaciones reducidas, **escala fija** (se ve igual con la escala de Windows al 125 % o 150 %), exportar los datos y borrar el curso.

El modo maestro se cierra solo tras 5 minutos sin actividad.

## Principios de diseño

- **La pizarra nunca muestra resultados individuales negativos**: solo totales de clase.
- **El «no» es neutro**: sin sonido triste, sin rojo y sin animación.
- **El objetivo de grupo se consigue con un umbral**, nunca por unanimidad.

## Privacidad

Está pensada para tratar lo mínimo posible datos de menores:

- **Sin fotografías** del alumnado: solo avatares dibujados.
- En pantalla, nombre e inicial del apellido.
- Base de datos en Supabase, **en la UE**, con reglas de seguridad (RLS) en todas las tablas: cada cuenta solo ve sus clases.
- **Registro cerrado** y cuentas creadas por la persona administradora.
- Botón para **exportar y borrar** todos los datos del curso a final de año.
- Las respuestas se guardan primero en el ordenador y se envían solas a la nube; si se va la conexión, no se pierde nada.

## Cómo está hecho

HTML, CSS y JavaScript sin frameworks ni compilación: lo que hay en el repositorio es exactamente lo que se publica. Los datos van en [Supabase](https://supabase.com). El esquema de la base de datos y la guía de instalación no se publican en este repositorio.

| Archivo | Qué hace |
|---|---|
| `index.html` | Todas las pantallas (pizarra y modo maestro) |
| `css/base.css`, `css/app.css` | Estilos |
| `js/config.js` | URL y clave pública de Supabase (públicas por diseño: la seguridad la ponen las reglas RLS) |
| `js/nube.js`, `js/cola.js`, `js/datos.js` | Conexión, guardado a prueba de cortes de red y datos |
| `js/pizarra.js` | Inicio, elegir objetivo, autoevaluación y resultado |
| `js/revision.js`, `js/puntos.js`, `js/premios.js`, `js/alumnado.js`, `js/objetivos.js`, `js/ajustes.js`, `js/usuarios.js` | Pantallas del modo maestro |
| `js/encajar.js`, `js/escala.js` | Que todo quepa sin desplazar; escala fija |
| `js/seneca.js` | Lector del PDF de Séneca |
| `js/avatares.js`, `js/iconos.js` | Monstruitos en SVG y catálogo de iconos |
| `js/sonido.js`, `js/bucle.js`, `js/fx.js`, `js/dialogo.js` | Sonido, música en bucle sin cortes, confeti y ventanas |

### Probarlo en local

Hay que servir la carpeta con un servidor web (por ejemplo, la extensión *Live Server* de VS Code, `npx serve .` o `python -m http.server 8080`).

## Créditos de terceros

- Iconos [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) de Microsoft (MIT): licencia en [`img/emoji/LICENSE-fluentui-emoji.txt`](img/emoji/LICENSE-fluentui-emoji.txt).
- [supabase-js](https://github.com/supabase/supabase-js) (MIT): licencia en [`js/vendor/supabase-LICENSE.txt`](js/vendor/supabase-LICENSE.txt).
- Música de [Pixabay](https://pixabay.com) (licencia de contenido de Pixabay): «Kids - Kids Music» y «Relaxing Music» de Verclub_Music; «Soft Guitar» y «Positive Soft» de The_Mountain.
- Tipografía [Baloo 2](https://fonts.google.com/specimen/Baloo+2) (SIL Open Font License), de Google Fonts.

---

Hecho por profe Dani.
