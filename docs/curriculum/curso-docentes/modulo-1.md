# Módulo 1: Tu primera hoja con Gemini

Parte de [curso-docentes](./README.md). Caso: [Andrés, 2.º de Bachillerato](../fichas/andres-2-bachillerato.md). Orden de grabación en [plan-grabacion.md](./plan-grabacion.md). Lo que se dijo en los seis videos está en [transcripciones-modulo-1.md](./transcripciones-modulo-1.md).

## Para qué sirve este módulo

Es el paso cero, para el docente que nunca ha abierto Gemini o que lo usa solo para preguntas sueltas. Al terminar distingue un pedido corto de uno que sirve para su clase.

Lo que no tiene el curso de Google está en las preguntas, no en un video más: el libro del Ministerio, la cifra inventada y la pregunta que le dice al estudiante dónde está la falacia.

## Los segmentos

Cada segmento es una lección en la app.

| # | Segmento | Tipo | Duración |
|---|---|---|---|
| 1.1 | Bienvenida al curso | Video a cámara, grabado | `1.bienvenida.mp4` |
| 1.2 | Antes de empezar | Preguntas | qué no pegar, la promo de Gemini |
| 1.3 | Andrés y Gemini | Video de pantalla, grabado | `2buscandogeminicomoia.mp4` |
| 1.4 | El pedido corto | Video de pantalla, grabado | `3.prompt-generico-engemini.mp4` |
| 1.5 | Qué le faltó | Pregunta | entre los dos videos, sin nota |
| 1.6 | El pedido completo | Video de pantalla, grabado | `4.promptestructurado.mp4` |
| 1.7 | Las cinco piezas y tu plantilla | Lectura | sin video |
| 1.8 | Las dos respuestas | Video de pantalla, grabado | `5.compraciondeprompts.mp4` |
| 1.9 | Revisa tú | Preguntas | el libro, la cifra, la pista |
| 1.10 | Cierre | Video a cámara, grabado | `6.finalyrevision.mp4` |
| 1.11 | Para el lunes | Pregunta | sin video |
| 1.12 | Taller | Laboratorio con nota | falta código |

En total son unos 40 minutos, con 14 de video.

## Estado de la grabación, 25 de octubre de 2026

Carpeta: `Movies/Curso introductorio prompts`. Seis videos, unos 12 minutos.

| Archivo | Cubre | Qué falta |
|---|---|---|
| `1.bienvenida.mp4` | Quién es, Gemini, discernir resultados, qué darle y qué no | El caso de Andrés y qué se lleva hoy. Van en el texto y en el video 2 |
| `2buscandogeminicomoia.mp4` | El caso de Andrés y cómo encontrar Gemini | La frase de Gemini Pro gratis por 12 o 18 meses con el correo institucional no es cierta. Hay que cortarla |
| `3.prompt-generico-engemini.mp4` | El pedido corto, la hora de 90 minutos y el porcentaje que no se puede contrastar | — |
| `4.promptestructurado.mp4` | El pedido completo, pieza por pieza, con los 40 minutos y «no inventes datos» | La plantilla para copiar va en el texto |
| `5.compraciondeprompts.mp4` | Por qué el pedido corto arma una clase entera y el completo da los ejercicios | — |
| `6.finalyrevision.mp4` | La pregunta que da la pista («antes de la última oración») y el cierre del módulo | — |

Decisión del 25 de octubre: no se regraba. No hay libro en el escritorio, y corregir en vivo, exportar a Documentos y el «para el lunes» no van en video. Eso queda en las preguntas de Antes de empezar, Revisa tú y Para el lunes. Entre el video del pedido corto y el del pedido completo va la pregunta «Qué le faltó»: el docente dice qué le agregaría antes de ver cómo lo escribe Andrés. La frase del video 2 sobre Gemini Pro gratis 12 o 18 meses para docentes no es cierta; la corrige una pregunta, no un video nuevo.

Mientras mira los videos de pantalla, el docente tiene Gemini abierto en otra pestaña y hace lo mismo con su materia. Cada video lo dice al principio.

## Antes de grabar

Todo se graba en el computador con OBS, en `gemini.google.com` con Chrome. El video sale horizontal y llena el reproductor. Muchos docentes lo van a ver en el teléfono; por eso el texto de cada lección lleva una línea «En el celular».

**OBS**

- Lienzo y salida en 1920 × 1080, a 30 cuadros por segundo.
- Escena «Cámara»: solo tu cámara, para 1.1 y 1.11.
- Escena «Pantalla»: «Captura de ventana» de Chrome a pantalla completa y tu cámara chica abajo a la derecha. Si no quieres salir, deja solo la ventana.
- Prueba el micrófono diez segundos y escúchalo antes de empezar.

**Chrome**

- Un perfil de Chrome solo para grabar, con tu Gmail, sin otras pestañas ni barra de favoritos.
- El zoom en 125 % o 150 % (Ctrl y + en Windows, Cmd y + en Mac), para que se lea en un celular.
- Los pedidos de este documento, abiertos en otro lado para copiarlos. En el video los escribes o los pegas pieza por pieza.
- Si se ve tu correo, tápalo después con un recuadro o recorta esos segundos.

**Durante la grabación**

- La IA nunca responde igual dos veces. Los guiones no te dan frases fijas: te dicen qué buscar en lo que te salga.
- Cuando termines cada video de pantalla, copia la respuesta de Gemini en un documento aparte. Esas respuestas reales van en el texto de las lecciones.
- Anota el nombre en español de cada botón que toques. Los de este documento salen de la ayuda de Google en inglés.

---

## 1.1 Bienvenida al curso

**Video a cámara, 2 minutos.** No lo leas. Estos son los puntos, en orden, con una forma posible de decirlos; dilo con tus palabras.

| Punto | Una forma de decirlo |
|---|---|
| Quién eres | «Hola, soy [tu nombre]. No soy profesor. Soy ingeniero y trabajo con inteligencia artificial desde los primeros GPT, cuando casi nadie los usaba.» |
| Por qué este curso | «Lo armé porque veo a muchos docentes que prueban la IA una vez, les sale algo genérico y la dejan. O peor: imprimen lo que sale sin revisarlo.» |
| Qué te voy a enseñar | «Dar clase lo sabes tú. Yo sé cómo responde esta herramienta, dónde se equivoca y cómo pedirle las cosas para que lo que te devuelva sirva en tu curso.» |
| El caso | «Vamos a seguir a Andrés, un profe de Lengua de segundo de bachillerato en un colegio fiscal de Manta. Andrés es un caso armado con el libro de segundo del Ministerio, y lo que le sale a él de Gemini es real.» |
| Cómo funciona | «Cada módulo tiene videos cortos. Mientras los ves, abre Gemini en otra pestaña y hazlo con tu materia. Hay preguntas que no tienen nota, para que pruebes, y al final un taller que sí la tiene.» |
| Qué te llevas hoy | «Al terminar este primer módulo tienes una hoja de tu próxima clase, revisada y lista para imprimir. Vamos.» |

No prometas en cámara nada que la app todavía no haga (saltarse módulos, Mi unidad, el certificado).

**Grabado el 25 de octubre de 2026**, 1 minuto. Cubre quién eres, revisar lo que da la IA y qué darle y qué no. No cubre el caso de Andrés, cómo funciona cada módulo ni qué se lleva hoy; eso va en el texto de abajo y en la primera frase de 1.3.

**Texto de la lección**

Cómo funciona cada módulo:

1. Videos cortos. Mientras los ves, ten Gemini abierto en otra pestaña y hazlo con tu materia.
2. Preguntas rápidas que no tienen nota. Tocas una opción y lees por qué.
3. Un taller al final, que sí tiene nota.

Vamos a seguir a Andrés, docente de Lengua de 2.º de Bachillerato en un colegio fiscal de Manta. Andrés es un caso armado con el libro de 2.º del Ministerio; lo que le devuelve Gemini es real.

Al terminar este módulo tienes una hoja de tu próxima clase, revisada y lista para imprimir.

---

## 1.2 Antes de empezar

**Preguntas rápidas.** Lección de texto, sin video.

Dos preguntas para ver de dónde parte cada uno. No tienen nota.

```text
:::pregunta Un colega te cuenta: «Le pedí a la IA una prueba, me salió perfecta y la imprimí tal cual». ¿Qué le preguntas primero?
- [ ] ¿Qué IA usaste?
  Cambia menos de lo que parece. Todas pueden inventar un dato o equivocarse en una respuesta.
- [x] ¿La contestaste tú antes de imprimirla?
  Contestarla es la forma más rápida de ver si una pregunta está mal hecha o si la clave está mal. Lo vemos cuando revises la hoja, más adelante.
- [ ] ¿Cuánto te demoraste?
  Ahorrar tiempo sirve si la hoja está bien. Si tiene un error, lo pagas en clase.
:::

:::pregunta Abres un chat nuevo en Gemini. ¿Qué sabe de tu curso?
- [ ] Lo suficiente, porque sabe de educación en general.
  Sabe de educación en general, y eso es lo que te va a devolver: algo general.
- [x] Casi nada. Lo que necesita saber se lo tienes que escribir.
  Ni el grado, ni cuánto dura tu hora, ni qué libro usas. Todo eso va en el pedido.
- [ ] Lo que le contaste en otros chats.
  Algunas cuentas recuerdan chats anteriores, pero no cuentes con eso para preparar una clase.
:::

:::pregunta ¿Qué puedes pegar en Gemini cuando armas una hoja?
- [ ] La lista del curso, con nombres y notas, para que la hoja salga a su medida.
  Con eso Gemini queda sabiendo quién es cada estudiante. La hoja se arma con el grado y con lo que el grupo todavía no logra, sin nombres.
- [x] El grado, lo que ya vieron y en qué se equivocan. Sin nombres, sin notas y sin datos de tus estudiantes.
  Es una cuenta personal. Google puede usar estos chats para mejorar su modelo.
- [ ] El correo y el teléfono del representante, por si hay que citarlo.
  Eso no hace falta para una hoja de clase, y no se pega.
:::

:::pregunta Un colega dice: «Con el correo del colegio, Google te regala Gemini Pro por un año o año y medio». ¿Qué le dices?
- [ ] Que aproveche, porque es automático con el correo institucional.
  No lo es. El administrador del colegio es quien activa Gemini en las cuentas del colegio, y no es un plan Pro de regalo.
- [x] Que esa promoción es para estudiantes universitarios, no para docentes de colegio.
  En Ecuador, en 2026, el año gratis es Google AI Plus para universitarios. Un docente de colegio no entra por tener correo institucional.
- [ ] Que Gemini gratis no sirve para dar clase.
  La versión gratis alcanza para lo de este módulo. El plan de pago no es lo que cambia el resultado.
:::
```

---

## 1.3 Entra y prueba

**Video de pantalla, 2 minutos.** Es la apertura del módulo: un pedido corto y lo que devuelve.

| Momento | Qué haces | Qué dices |
|---|---|---|
| 0:00 | Escribes `gemini.google.com` en Chrome | «En todo el curso vamos a seguir a Andrés, un profe de Lengua de segundo de bachillerato en Manta. Abre Gemini en otra pestaña y hazlo conmigo. Entras con tu cuenta de Gmail.» |
| 0:15 | Señalas la caja de abajo | «Antes de escribir, una sola regla: aquí no pegues nombres, notas ni datos de tus estudiantes. Es una cuenta personal y Google puede usar estos chats para mejorar su modelo.» |
| 0:30 | Escribes «Hazme un taller de argumentación para bachillerato, con preguntas» y envías | «Este es el pedido que casi todos mandamos la primera vez.» |
| 0:50 | Bajas por la respuesta despacio, con el cursor | Buscas en voz alta tres cosas: cuánto dura, para quién es, y si hay alguna cifra o algún estudio |
| 1:30 | Te detienes en la cifra, si sale | «¿De dónde salió esto? Yo no se lo di.» |
| 1:45 | — | «Le pedí casi nada. Lo que no le dije, el curso, el tiempo, los ejemplos, lo decidió él. Y la cifra la puso él.» |

Si no sale ninguna cifra, abre el documento con la respuesta del anexo y di: «La primera vez que lo hice me salió esto», señalando la frase de la Academia Americana de Pediatría.

**Texto de la lección**

1. Entra a `gemini.google.com` con tu cuenta de Gmail. Si no tienes, la creas gratis en `accounts.google.com`.
2. Escribe un pedido corto, como el del video, y mira qué te devuelve.

En el celular: instala la app Gemini desde Play Store y entra con la misma cuenta.

Regla práctica: no pegues nombres, notas ni datos de tus estudiantes. Es tu cuenta personal y Google puede usar los chats para mejorar su modelo.

---

## 1.4 Qué pasó con ese pedido

**Lectura y una pregunta.**

Así le salió a Andrés (respuesta real, recortada):

- Una sesión de 90 minutos. Su hora dura 40.
- Para «estudiantes de bachillerato (15-18 años)», o sea, cualquier curso.
- Cinco bloques, un debate, una rúbrica y una moción sobre trigonometría.
- Esta frase: «Estudios de la Academia Americana de Pediatría muestran una mejora del 15 % en el rendimiento». Nadie le pasó esa fuente.

Gemini no se equivocó con el pedido. Le faltaba todo lo que Andrés sabe de su curso y lo llenó con lo más común. La cifra es otro problema: la institución existe y el número suena preciso, y por eso es fácil creerlo. Ese es el error más difícil de ver.

```text
:::pregunta Andrés escribe «Hazme un taller de argumentación para bachillerato». ¿Qué le llega?
- [ ] Un taller listo para su 2.º.
  Gemini no sabe qué ya vieron ni en qué se equivocan. Andrés no se lo dijo.
- [x] Definiciones y preguntas que sirven para cualquier curso.
  Lo que no le dijo, el modelo lo decidió por él: el nivel, la duración, los ejemplos.
- [ ] Gemini le pregunta primero qué necesita.
  Puede pasar, pero casi siempre rellena lo que falta y contesta igual. En el módulo 2 vemos cómo pedirle que pregunte.
:::
```

---

## Qué le faltó

**Pregunta, sin video y sin nota.** Va entre el video del pedido corto y el del pedido completo. Si los ve seguidos, el segundo le dice lo que tenía que notar en el primero.

```text
:::pregunta En el video, la clase salió de hora y media y apareció un porcentaje que nadie escribió. Antes de ver el segundo pedido, ¿qué le agregas tú?
- [ ] Más teoría: definiciones, tipos de argumento y ejemplos.
  Eso ya lo escribe Gemini solo. Por eso la hoja no es de tu curso.
- [x] Tu grado, los minutos de tu hora y que no invente cifras.
  Son las tres cosas que en este video decidió él. Andrés se las dice en el que sigue.
- [ ] Que te pregunte qué necesitas antes de armar la hoja.
  Puede servir, y lo vemos en el módulo 2. Hoy esas tres cosas van en el pedido desde el inicio.
:::
```

---

## 1.5 Armar el pedido, pieza por pieza

**Video de pantalla, 4 minutos.** Es el video central. Andrés arma el pedido frase por frase y dice qué decisión le quita al modelo con cada una.

Cada pieza va en su propia línea. En Gemini, Enter envía; para pasar de línea usa Shift y Enter.

**Texto de la lección**

Enter envía el mensaje. Para bajar de línea sin enviarlo, Shift y Enter. Las cinco piezas quedan escritas en la lección que sigue.

| Momento | Qué haces | Qué dices |
|---|---|---|
| 0:00 | Haces clic en «Nuevo chat», arriba a la izquierda | «Chat nuevo. Pausa el video cuando quieras y escribe tu versión con tu materia.» |
| 0:10 | Escribes: «Eres docente de Lengua de 2.º de Bachillerato en un colegio fiscal de Manta.» | «Con esto ya no elige el nivel por mí.» |
| 0:40 | Escribes: «Mis estudiantes ya saben qué es una tesis, pero todavía confunden un argumento con una opinión.» | «Esta es la línea que más cambia el resultado: qué saben y en qué se equivocan. Eso solo lo sabes tú.» |
| 1:20 | Escribes la tarea (abajo) | «Qué hoja quiero y para qué. Ya no "un taller": dos textos y cinco preguntas.» |
| 2:20 | Escribes: «Tengo 40 minutos de clase.» | «Si no se lo digo, me arma 90.» |
| 2:35 | Escribes: «Devuélvelo así: los dos textos y, debajo, las preguntas con su respuesta. No inventes datos ni cifras.» | «Cómo la quiero de vuelta, y lo que no debe hacer. Por la cifra de antes.» |
| 3:00 | Señalas las cinco líneas | «Cinco frases y ninguna es técnica. Es lo que le contarías a un colega que nunca ha entrado a tu curso.» |
| 3:20 | Envías y bajas por la respuesta | «Ahora son dos textos para mi clase. Pero todavía no se imprime. Primero se revisa, y eso es el siguiente video.» |

La tarea de la línea 1:20:

```text
Escribe dos opiniones cortas, de ocho líneas cada una, sobre si se debe prohibir el celular en el colegio: una a favor y otra en contra. En una de ellas pon una falacia clara. Después, cinco preguntas que se contestan con los dos textos: la tesis de cada uno, qué tipo de argumento usa cada autor y dónde está la falacia.
```

Después de grabar, lee la respuesta entera. Si trae tipos de argumento o falacias que no están en el libro, úsala en 1.7. Si no, en 1.7 usas la hoja del anexo.

---

## 1.6 Las cinco piezas y tu plantilla

**Lectura.** Copia la plantilla y llena lo que está entre corchetes. Debajo está el pedido que Andrés dice en el video, ya lleno.

```text
Un pedido que sirve tiene cinco piezas. Cada una le quita al modelo una decisión que, si no, toma él.

1. Quién eres y dónde enseñas. Si no lo dices, elige el nivel por ti.
2. Qué saben y en qué se equivocan. Es la pieza que más cambia el resultado, y solo la sabes tú.
3. Qué hoja necesitas y para qué. «Un taller» deja todo abierto. «Dos textos y cinco preguntas» no.
4. Cuánto tiempo tienes. Si no lo dices, te arma una sesión que no cabe en tu hora.
5. Cómo la quieres de vuelta y qué no debe hacer. Aquí va «no inventes datos ni cifras».

:::ejemplo Plantilla
Eres docente de [materia] de [grado] en [tu colegio, tu ciudad].
Mis estudiantes ya [lo que saben], pero todavía [en qué se equivocan].
Necesito [qué hoja] para que [qué tienen que lograr].
Tengo [minutos] de clase.
Devuélvelo así: [cómo]. No inventes datos ni cifras.
:::

:::ejemplo El pedido de Andrés
Eres docente de Lengua de 2.º de Bachillerato en un colegio fiscal de Manta.
Mis estudiantes ya saben qué es una tesis, pero todavía confunden un argumento con una opinión.
Escribe dos opiniones cortas, de ocho líneas cada una, sobre si se debe prohibir el celular en el colegio: una a favor y otra en contra. En una de ellas pon una falacia clara. Después, cinco preguntas que se contestan con los dos textos: la tesis de cada uno, qué tipo de argumento usa cada autor y dónde está la falacia.
Tengo 40 minutos de clase.
Devuélvelo así: los dos textos y, debajo, las preguntas con su respuesta. No inventes datos ni cifras.
:::

En el celular: escribir tanto con el pulgar cansa. Toca el micrófono del teclado y díctalo.
```

---

## 1.7 Revisar antes de imprimir

No se graba. El docente lo hace en las preguntas de 1.8, con la hoja del anexo. El guion queda como referencia de esas preguntas.

| Momento | Qué haces | Qué dices |
|---|---|---|
| 0:00 | La hoja en pantalla | «Antes de imprimir, cuatro preguntas. Hazlas con la hoja que te salió a ti.» |
| 0:10 | Señalas el largo de los textos | «Una: ¿cabe en mi hora? Dos textos cortos y cinco preguntas, sí.» |
| 0:30 | Bajas buscando números | «Dos: ¿hay una cifra, un estudio o una cita que yo no le di? Aquí no. El "no inventes cifras" funcionó.» |
| 1:00 | Abres el libro y te detienes en las respuestas 3 y 4 | «Tres: ¿usa lo que yo enseño? Causa y consecuencia sí está en el libro. "Utilidad práctica", no. Si imprimo esto, mis chicos buscan en el libro un tipo de argumento que no existe.» |
| 2:00 | Te detienes en la pregunta 3 | «Cuatro: ¿la contesté yo? Al contestarla veo que la pregunta dice "antes de la última oración". Les estoy diciendo dónde está la falacia.» |
| 2:30 | Te detienes en la respuesta 5 | «Y aquí dice "hombre de paja". El libro enseña tres falacias y esa no es una. Esta frase es una falacia contra la persona.» |
| 2:50 | — | «Tres cosas por corregir, y ninguna se ve si no la lees entera.» |

Si usas tu propia respuesta de 1.5 en vez del anexo, cambia los ejemplos por los errores que encontraste.

**Texto de la lección**

Con la respuesta en pantalla, hazte cuatro preguntas:

1. **¿Cabe en mi hora?**
2. **¿Hay una cifra, un estudio o una cita que yo no le di?** Si la hay, búscala: que exista y que diga eso. Si no la encuentras, la quitas. No le preguntes a Gemini si es verdad, porque te puede decir que sí con la misma seguridad.
3. **¿Usa lo que yo enseño?** Gemini no sabe qué libro usas. Si no le pegas tu lista, usa la suya.
4. **¿La contesté yo?** Responde las preguntas con el texto al lado. Si una no se puede contestar con el texto, o le regala la respuesta al estudiante, la cambias.

Que esté bien escrito no quiere decir que esté bien. Gemini escribe igual de claro cuando acierta que cuando inventa.

---

## 1.8 Revisa tú

**Preguntas rápidas.** Primero, las cuatro preguntas con las que se lee una hoja. Después, la hoja. Cada pregunta de abajo trae un solo error.

```text
Antes de imprimir, hazte cuatro preguntas.

1. ¿Cabe en mi hora?
2. ¿Hay una cifra, un estudio o una cita que yo no le di?
3. ¿Usa lo que yo enseño?
4. ¿La contesté yo?

:::ejemplo Del pedido corto
«Este taller está diseñado para una sesión práctica de 90 minutos dirigida a estudiantes de bachillerato (15-18 años)».
«Estudios de la Academia Americana de Pediatría muestran una mejora del 15 % en el rendimiento y una reducción del absentismo en escuelas con horarios retrasados».
:::

:::ejemplo La hoja del pedido completo
Texto 1. A favor de la prohibición.

El uso del teléfono celular debe prohibirse de manera total dentro de la institución educativa. La presencia de estos aparatos interrumpe la atención de los estudiantes, quienes pasan el tiempo revisando notificaciones en vez de seguir la explicación de la pizarra. Además, la facilidad de acceso a internet durante las evaluaciones fomenta la deshonestidad académica en pruebas escritas y trabajos en grupo. Al no tener el teléfono a mano, los jóvenes se ven obligados a interactuar directamente con sus compañeros en los recreos y a participar en los talleres de clase. Todo aquel que defiende que los alumnos tengan el teléfono en el aula simplemente no tiene ningún interés por el futuro de la juventud ni le importa que la educación pública fracase.

Texto 2. En contra de la prohibición.

El teléfono celular no debe prohibirse en el colegio, sino regularse como un recurso pedagógico. Este dispositivo permite consultar de forma inmediata diccionarios, documentos y lecturas cuando la biblioteca no cuenta con libros suficientes para todos. Asimismo, funciona como un canal de comunicación rápido con los representantes frente a emergencias familiares, cambios de horario o situaciones de riesgo en la salida. Prohibir la tecnología no enseña a utilizarla; la escuela tiene la responsabilidad de formar en el uso ético y moderado de las herramientas que los bachilleres utilizarán en la vida laboral y universitaria.

| # | Pregunta | Respuesta que dio |
|---|---|---|
| 1 | ¿Cuál es la tesis del Texto 1? | Se debe prohibir totalmente el uso del celular dentro de la institución |
| 2 | ¿Cuál es la tesis del Texto 2? | No se debe prohibir, sino regular su uso como herramienta pedagógica |
| 3 | ¿Qué tipo de argumentos usa el Texto 1 (antes de la última oración)? | Causa y consecuencia: distrae, facilita la copia, obliga a convivir |
| 4 | ¿Qué tipo de argumentos usa el Texto 2? | Utilidad práctica |
| 5 | ¿En cuál texto hay una falacia, de qué tipo y dónde? | Texto 1, última oración. Contra la persona, combinada con hombre de paja |
:::

:::pregunta El taller del primer pedido dice: «Estudios de la Academia Americana de Pediatría muestran una mejora del 15 % en el rendimiento». ¿Qué hace Andrés?
- [ ] Lo deja, porque cita una institución seria.
  La institución existe, pero ese 15 % lo escribió el modelo y nadie se lo dio. Sus estudiantes lo van a repetir como cierto.
- [x] Busca la fuente y, si no la encuentra, lo quita.
  Una cifra sin fuente no entra en una hoja. Por eso el segundo pedido dice «no inventes datos ni cifras».
- [ ] Le pregunta a Gemini si el dato es verdad.
  Te puede decir que sí con la misma seguridad. La fuente se busca, no se pregunta.
:::

:::pregunta La hoja dice que el texto 2 usa argumentos de «utilidad práctica». ¿Qué problema tiene?
- [ ] Ninguno, se entiende bien.
  Se entiende, pero tus chicos lo van a buscar en el libro y no lo van a encontrar.
- [x] Ese tipo de argumento no está en el libro de 2.º.
  El libro enseña datos, citas de autoridad, ejemplo, experiencia personal, analogía, verdades universales y causa y consecuencia. Gemini no sabe qué libro usas; tienes que pegarle la lista.
- [ ] Es muy difícil para segundo.
  El nivel no es el problema. El problema es que no coincide con lo que les enseñas.
:::

:::pregunta La pregunta 3 de la hoja dice: «¿Qué tipo de argumentos usa el Texto 1 (antes de la última oración)?». ¿Qué cambiarías?
- [ ] Nada, está clara.
  Está clara, y por eso mismo les avisa que la última oración es distinta. Ahí está la falacia.
- [x] Quitaría «antes de la última oración».
  Les dice dónde está la falacia antes de que la busquen. La pregunta 5 ya no mide nada.
- [ ] La haría más larga para que la entiendan.
  El problema no es el largo. Es lo que le regala al estudiante.
:::

:::pregunta La respuesta 5 dice que la última oración es «contra la persona, combinada con hombre de paja». ¿Qué dejas?
- [ ] Las dos, porque las dos son falacias.
  «Hombre de paja» no está en el libro de 2.º. Si la dejas, la van a buscar y no la van a encontrar.
- [x] Contra la persona. «Hombre de paja» lo quitas.
  El libro enseña contra la persona, por la fuerza y la que apela a las emociones. La última oración ataca a quien defiende el celular, no a su argumento.
- [ ] Ninguna. El texto discute la prohibición y ya.
  La última oración no discute la idea. Dice que a quien la defiende no le importa la educación. Eso es contra la persona.
:::
```

---

## 1.9 Corregir y llevarla a Documentos

No se graba. Corregir en el chat y exportar a Documentos quedan fuera de este módulo.

| Momento | Qué haces | Qué dices |
|---|---|---|
| 0:00 | En el mismo chat, escribes la corrección (abajo) y envías | «En el mismo chat. Ya tiene la hoja, no hay que repetir todo.» |
| 0:40 | Revisas las preguntas 3, 4 y 5 | Lees en voz alta los tipos de argumento nuevos y confirmas que están en la lista |
| 1:10 | Debajo de la respuesta, clic en «Compartir y exportar» y luego en «Exportar a Documentos» | «Esto crea un documento en tu Drive.» |
| 1:30 | Abres el documento en otra pestaña | «Aquí le pones tu nombre y el del colegio, y lo imprimes.» |
| 1:50 | — | «El primer resultado casi nunca se imprime. Se lee, se corrige y se vuelve a pedir.» |

La corrección de Andrés:

```text
Cambia la pregunta 4: usa solo estos tipos de argumento, que son los del libro: datos, citas de autoridad, ejemplo, experiencia personal, analogía, verdades universales y causa y consecuencia. En la pregunta 3 quita «antes de la última oración», porque les dice dónde está la falacia. En la pregunta 5 usa solo las falacias que vemos en clase: contra la persona, por la fuerza y la que apela a las emociones.
```

Si en 1.5 te salieron otros errores, escribe la corrección para esos.

**Texto de la lección**

1. **Corrige en el mismo chat.** El modelo recuerda la hoja que te dio. Di qué cambiar y por qué, pregunta por pregunta.
2. **Revisa la nueva respuesta** con las mismas cuatro preguntas. A veces arregla una cosa y descompone otra.
3. **Llévala a Documentos.** Debajo de la respuesta, haz clic en «Compartir y exportar» y luego en «Exportar a Documentos».
4. **Ábrela en Google Docs**, ajusta lo que quieras e imprime.

En el celular: debajo de la respuesta, toca «Más» (los tres puntos) y luego «Exportar a Documentos».

---

## 1.10 Taller

**Hoy se puede publicar la parte B** con el laboratorio que ya existe, que califica un pedido. La parte A necesita código (ver [interactivos.md](./interactivos.md)).

**Parte B: Tu hoja.** El docente escribe el pedido de una hoja para su próxima clase, o de una que ya usa y quiere mejorar. Se califica con la rúbrica del laboratorio: las cinco piezas, que no haya datos de estudiantes y que la tarea diga qué hoja y para qué. Cuando exista la calificación de dos versiones, también escribe la corrección y se califican las dos.

**Parte A: Encuentra el error.** Cuatro tarjetas con un fragmento de la hoja real de Andrés y un solo error cada una: la cifra sin fuente, «utilidad práctica», «hombre de paja» y la pregunta que dice dónde está la falacia. El docente toca la frase con el error y escribe en una línea por qué. Se califica si encontró el error, si la razón es correcta y si marcó algo que no era error.

Va después de 1.7 y 1.8, no antes. La investigación sobre ejemplos con errores muestra que confunden a quien todavía no vio la versión correcta ([Große y Renkl, 2007](https://doi.org/10.1016/j.learninstruc.2007.09.008)) y que funcionan mejor con un error por ejemplo y pidiendo que expliquen por qué está mal ([McLaren et al., 2012](https://doi.org/10.1007/978-3-642-33263-0_18)).

---

## 1.11 Para el lunes

Pregunta, sin video.

```text
:::pregunta Esta semana, ¿qué haces con lo de hoy?
- [ ] Esperas al siguiente módulo.
  El pedido se aprende usándolo en tu clase, no viendo el siguiente video.
- [x] Armas con la plantilla la hoja de tu próxima clase y la lees antes de usarla.
  Fíjate si cabe en tu hora y si hay alguna cifra que tú no le diste.
- [ ] Imprimes el primer resultado, porque ya salió bien escrito.
  Que esté bien escrito no quiere decir que sirva para tu curso. Es lo que le pasó a Andrés con el pedido corto.
:::
```

---

## Pendiente de confirmar

- El nombre en español de «Nuevo chat», «Compartir y exportar» y «Exportar a Documentos» en la web, y de «Más» en la app.
- La duración de la hora de clase en los colegios fiscales.
- Qué herramienta dio las dos respuestas del anexo. Si no fue Gemini, en 1.3 y 1.7 se usan las respuestas grabadas hoy.
- Las páginas del libro (pp. 41-44) en el PDF del Ministerio.

---

## Anexo: las dos respuestas reales

Pegadas por el equipo el 21 de octubre de 2026. Herramienta por confirmar.

### Con el pedido corto

Pedido: «Hazme un taller de argumentación para bachillerato, con preguntas».

Resumen de la respuesta. No es el texto completo: se dejaron las partes que usa la lección.

- Arranca así: «Este taller está diseñado para una sesión práctica de 90 minutos dirigida a estudiantes de bachillerato (15-18 años)».
- Trae cinco bloques:
  1. Conceptos clave (tesis, premisas, evidencia, falacia).
  2. Modelo A-R-E (afirmación, razonamiento, evidencia).
  3. Detección de falacias, con una tabla de cinco: ad hominem, hombre de paja, falso dilema, ad populum y causa falsa.
  4. Debate «ping-pong».
  5. Rúbrica de autoevaluación.
- En el ejemplo del modelo A-R-E dice: «Estudios de la Academia Americana de Pediatría muestran una mejora del 15 % en el rendimiento y una reducción del absentismo en escuelas con horarios retrasados».
- Entre las mociones del debate propone: «La educación financiera debería ser una asignatura obligatoria en lugar de asignaturas tradicionales como trigonometría avanzada».

### Con el pedido completo

Pedido: el de la lección 1.5.

**Texto 1: A favor de la prohibición**

El uso del teléfono celular debe prohibirse de manera total dentro de la institución educativa. La presencia de estos aparatos interrumpe la atención de los estudiantes, quienes pasan el tiempo revisando notificaciones en vez de seguir la explicación de la pizarra. Además, la facilidad de acceso a internet durante las evaluaciones fomenta la deshonestidad académica en pruebas escritas y trabajos en grupo. Al no tener el teléfono a mano, los jóvenes se ven obligados a interactuar directamente con sus compañeros en los recreos y a participar en los talleres de clase. Todo aquel que defiende que los alumnos tengan el teléfono en el aula simplemente no tiene ningún interés por el futuro de la juventud ni le importa que la educación pública fracase.

**Texto 2: En contra de la prohibición**

El teléfono celular no debe prohibirse en el colegio, sino regularse como un recurso pedagógico. Este dispositivo permite consultar de forma inmediata diccionarios, documentos y lecturas cuando la biblioteca no cuenta con libros suficientes para todos. Asimismo, funciona como un canal de comunicación rápido con los representantes frente a emergencias familiares, cambios de horario o situaciones de riesgo en la salida. Prohibir la tecnología no enseña a utilizarla; la escuela tiene la responsabilidad de formar en el uso ético y moderado de las herramientas que los bachilleres utilizarán en la vida laboral y universitaria.

**Cuestionario (con solucionario)**

| # | Pregunta | Respuesta que dio | Qué revisar |
|---|---|---|---|
| 1 | ¿Cuál es la tesis del Texto 1? | Se debe prohibir totalmente el uso del celular dentro de la institución | Bien |
| 2 | ¿Cuál es la tesis del Texto 2? | No se debe prohibir, sino regular su uso como herramienta pedagógica y de formación | Bien |
| 3 | ¿Qué tipo de argumentos usa el Texto 1 (antes de la última oración)? | Causa-efecto: distrae, facilita la copia, fomenta la convivencia | El tipo está bien: es «causa y consecuencia» del libro (p. 43). «Antes de la última oración» dice dónde está la falacia |
| 4 | ¿Qué tipo de argumentos usa el Texto 2? | Utilidad práctica / fines pedagógicos | «Utilidad práctica» no está en el libro |
| 5 | ¿En cuál texto hay una falacia, de qué tipo y dónde? | Texto 1, última oración. «Ad hominem combinada con hombre de paja» | Ad hominem es la falacia contra la persona del libro. «Hombre de paja» no está en el libro |
