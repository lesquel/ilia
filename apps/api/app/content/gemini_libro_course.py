"""Curso «Preparar tu clase con Gemini y tu libro» (módulos 1 a 3).

Diseño: `docs/curriculum/curso-docentes/`. Caso: Andrés, Lengua de 2.º de
Bachillerato, colegio fiscal de Manta. Las lecciones con video apuntan a
`cursos/curso-docentes/<archivo>.mp4`. Los cuerpos se escriben directos: no
pasan por `_attach_examples`, igual que `introduccion-ia-docentes`.

Los ejemplos de Gemini son recortes literales de respuestas reales guardadas
el 9 de noviembre de 2026; no se reescribe lo que Gemini dijo.
"""

from typing import Any

Lesson = tuple[str, str, int, str] | tuple[str, str, int, str, str]

MEDIA_PREFIX = "cursos/curso-docentes/"

SLUG = "gemini-con-tu-libro"


def _video(title: str, seconds: int, body: str, media_name: str) -> Lesson:
    return (title, "video", seconds, body.strip(), f"{MEDIA_PREFIX}{media_name}.mp4")


def _text(title: str, seconds: int, body: str) -> Lesson:
    return (title, "text", seconds, body.strip())


# ---------------------------------------------------------------------------
# Módulo 1: Tu primera hoja con Gemini
# ---------------------------------------------------------------------------

M1_BIENVENIDA = """
Cómo funciona cada módulo:
1. Videos cortos. Mientras los ves, ten Gemini abierto en otra pestaña y hazlo con tu materia.
2. Preguntas rápidas que no tienen nota. Tocas una opción y lees por qué.
3. Un taller al final, que sí tiene nota.

Vamos a seguir a Andrés, docente de Lengua de 2.º de Bachillerato en un colegio fiscal de Manta. Andrés es un caso armado con el libro de 2.º del Ministerio; lo que le devuelve Gemini es real.

Al terminar este módulo tienes una hoja de tu próxima clase, revisada y lista para imprimir.
"""

M1_ANTES = """
Dos preguntas para ver de dónde parte cada uno. No tienen nota.

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
"""

M1_ANDRES_Y_GEMINI = """
1. Entra a `gemini.google.com` con tu cuenta de Gmail. Si no tienes, la creas gratis en `accounts.google.com`.
2. Escribe un pedido corto, como el del video, y mira qué te devuelve.

En el celular: instala la app Gemini desde Play Store y entra con la misma cuenta.

Regla práctica: no pegues nombres, notas ni datos de tus estudiantes. Es tu cuenta personal y Google puede usar los chats para mejorar su modelo.
"""

M1_PEDIDO_CORTO = """
Así le salió a Andrés (respuesta real, recortada):
- Una sesión de 90 minutos. Su hora dura 40.
- Para «estudiantes de bachillerato (15-18 años)», o sea, cualquier curso.
- Cinco bloques, un debate, una rúbrica y una moción sobre trigonometría.
- Esta frase: «Estudios de la Academia Americana de Pediatría muestran una mejora del 15 % en el rendimiento». Nadie le pasó esa fuente.

Gemini no se equivocó con el pedido. Le faltaba todo lo que Andrés sabe de su curso y lo llenó con lo más común. La cifra es otro problema: la institución existe y el número suena preciso, y por eso es fácil creerlo. Ese es el error más difícil de ver.

:::pregunta Andrés escribe «Hazme un taller de argumentación para bachillerato». ¿Qué le llega?
- [ ] Un taller listo para su 2.º.
  Gemini no sabe qué ya vieron ni en qué se equivocan. Andrés no se lo dijo.
- [x] Definiciones y preguntas que sirven para cualquier curso.
  Lo que no le dijo, el modelo lo decidió por él: el nivel, la duración, los ejemplos.
- [ ] Gemini le pregunta primero qué necesita.
  Puede pasar, pero casi siempre rellena lo que falta y contesta igual. En el módulo 2 vemos cómo pedirle que pregunte.
:::
"""

M1_QUE_LE_FALTO = """
Esta pregunta no tiene nota. Va entre el video del pedido corto y el del pedido completo, para que digas qué le agregarías antes de ver cómo lo escribe Andrés.

:::pregunta En el video, la clase salió de hora y media y apareció un porcentaje que nadie escribió. Antes de ver el segundo pedido, ¿qué le agregas tú?
- [ ] Más teoría: definiciones, tipos de argumento y ejemplos.
  Eso ya lo escribe Gemini solo. Por eso la hoja no es de tu curso.
- [x] Tu grado, los minutos de tu hora y que no invente cifras.
  Son las tres cosas que en este video decidió él. Andrés se las dice en el que sigue.
- [ ] Que te pregunte qué necesitas antes de armar la hoja.
  Puede servir, y lo vemos en el módulo 2. Hoy esas tres cosas van en el pedido desde el inicio.
:::
"""

M1_PEDIDO_COMPLETO = """
Enter envía el mensaje. Para bajar de línea sin enviarlo, Shift y Enter. Las cinco piezas quedan escritas en la lección que sigue.

Andrés escribe cada pieza en su propia línea. La tarea es la parte que más cambia respecto del pedido corto: ya no pide «un taller», pide dos textos y cinco preguntas.

:::ejemplo La tarea de Andrés
Escribe dos opiniones cortas, de ocho líneas cada una, sobre si se debe prohibir el celular en el colegio: una a favor y otra en contra. En una de ellas pon una falacia clara. Después, cinco preguntas que se contestan con los dos textos: la tesis de cada uno, qué tipo de argumento usa cada autor y dónde está la falacia.
:::
"""

M1_CINCO_PIEZAS = """
Un pedido que sirve tiene cinco piezas. Cada una le quita al modelo una decisión que, si no, toma él.

1. **Quién eres y dónde enseñas.** Si no lo dices, elige el nivel por ti.
2. **Qué saben y en qué se equivocan.** Es la pieza que más cambia el resultado, y solo la sabes tú.
3. **Qué hoja necesitas y para qué.** «Un taller» deja todo abierto. «Dos textos y cinco preguntas» no.
4. **Cuánto tiempo tienes.** Si no lo dices, te arma una sesión que no cabe en tu hora.
5. **Cómo la quieres de vuelta y qué no debe hacer.** Aquí va «no inventes datos ni cifras».

Copia la plantilla y llena lo que está entre corchetes. Debajo está el pedido que Andrés dice en el video, ya lleno.

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
"""

M1_DOS_RESPUESTAS = """
El video pone una al lado de la otra la respuesta al pedido corto y la del pedido completo. La primera arma una clase entera, con bloques que Andrés no pidió. La segunda le da lo que necesita para su hora: los dos textos y las preguntas con su respuesta.
"""

M1_REVISA_TU = """
Con la respuesta en pantalla, hazte cuatro preguntas:
1. **¿Cabe en mi hora?**
2. **¿Hay una cifra, un estudio o una cita que yo no le di?** Si la hay, búscala: que exista y que diga eso. Si no la encuentras, la quitas. No le preguntes a Gemini si es verdad, porque te puede decir que sí con la misma seguridad.
3. **¿Usa lo que yo enseño?** Gemini no sabe qué libro usas. Si no le pegas tu lista, usa la suya.
4. **¿La contesté yo?** Responde las preguntas con el texto al lado. Si una no se puede contestar con el texto, o le regala la respuesta al estudiante, la cambias.

Que esté bien escrito no quiere decir que esté bien. Gemini escribe igual de claro cuando acierta que cuando inventa.

Cada pregunta de abajo trae un solo error.

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
"""

M1_CIERRE = """
Cuando ya tienes el resultado, no hace falta pedirlo todo de nuevo. Se corrige en el mismo chat, y después se lleva a Documentos.

1. **Corrige en el mismo chat.** El modelo recuerda la hoja que te dio. Di qué cambiar y por qué, pregunta por pregunta.
2. **Revisa la nueva respuesta** con las mismas cuatro preguntas. A veces arregla una cosa y descompone otra.
3. **Llévala a Documentos.** Debajo de la respuesta, haz clic en «Compartir y exportar» y luego en «Exportar a Documentos».
4. **Ábrela en Google Docs**, ajusta lo que quieras e imprime.

En el celular: debajo de la respuesta, toca «Más» (los tres puntos) y luego «Exportar a Documentos».

:::ejemplo La corrección de Andrés
Cambia la pregunta 4: usa solo estos tipos de argumento, que son los del libro: datos, citas de autoridad, ejemplo, experiencia personal, analogía, verdades universales y causa y consecuencia. En la pregunta 3 quita «antes de la última oración», porque les dice dónde está la falacia. En la pregunta 5 usa solo las falacias que vemos en clase: contra la persona, por la fuerza y la que apela a las emociones.
:::
"""

M1_PARA_EL_LUNES = """
:::pregunta Esta semana, ¿qué haces con lo de hoy?
- [ ] Esperas al siguiente módulo.
  El pedido se aprende usándolo en tu clase, no viendo el siguiente video.
- [x] Armas con la plantilla la hoja de tu próxima clase y la lees antes de usarla.
  Fíjate si cabe en tu hora y si hay alguna cifra que tú no le diste.
- [ ] Imprimes el primer resultado, porque ya salió bien escrito.
  Que esté bien escrito no quiere decir que sirva para tu curso. Es lo que le pasó a Andrés con el pedido corto.
:::
"""

MODULE_1_LESSONS: list[Lesson] = [
    _video("Bienvenida al curso", 64, M1_BIENVENIDA, "1-1-bienvenida"),
    _text("Antes de empezar", 240, M1_ANTES),
    _video("Andrés y Gemini", 66, M1_ANDRES_Y_GEMINI, "1-3-andres-y-gemini"),
    _video("El pedido corto", 220, M1_PEDIDO_CORTO, "1-4-el-pedido-corto"),
    _text("Qué le faltó", 90, M1_QUE_LE_FALTO),
    _video("El pedido completo", 187, M1_PEDIDO_COMPLETO, "1-6-el-pedido-completo"),
    _text("Las cinco piezas y tu plantilla", 240, M1_CINCO_PIEZAS),
    _video("Las dos respuestas", 107, M1_DOS_RESPUESTAS, "1-8-las-dos-respuestas"),
    _text("Revisa tú", 420, M1_REVISA_TU),
    _video("Cierre", 91, M1_CIERRE, "1-10-cierre"),
    _text("Para el lunes", 60, M1_PARA_EL_LUNES),
]

# ---------------------------------------------------------------------------
# Módulo 2: Que use tu libro
# ---------------------------------------------------------------------------

M2_COMO_TE_FUE = """
La semana pasada hiciste una hoja para tu clase. Piensa un momento: ¿la usaste? ¿Qué tuviste que cambiar antes de imprimirla?

A Andrés le pasó lo que le pasa a casi todos: Gemini usó palabras que no están en su libro, como «utilidad práctica» y «hombre de paja». Se ven bien, pero sus chicos las buscan en el libro y no las encuentran.

Hoy el libro entra en el pedido desde el principio. Y si alguna vez no sabes qué contarle, haces que Gemini te pregunte a ti.
"""

M2_ANTES = """
:::pregunta Andrés escribe en el pedido «usa el libro de Lengua de 2.º de Bachillerato del Ministerio». ¿Qué hace Gemini?
- [ ] Busca ese libro y usa su lista.
  No tiene el libro. Puede que ni sepa cuál es. Va a usar la lista que le parezca más común.
- [x] Usa lo que cree que dice un libro así.
  Suena a que entendió, pero no tiene la página. Si quieres que use tu lista, se la tienes que pasar.
- [ ] Le dice que no conoce el libro.
  Casi nunca lo dice. Contesta igual, con lo que tiene.
:::

:::pregunta ¿Cuál de estas es la forma más segura de que Gemini use los tipos de argumento de tu libro?
- [ ] Decirle el título y el año del libro.
  Le das el nombre, no el contenido. Sigue adivinando qué dice.
- [ ] Pedirle que use «los tipos de argumento oficiales».
  No hay una lista oficial única. El indicador del currículo y el libro de 2.º traen listas distintas.
- [x] Pasarle la página, o escribirle la lista tal como está en el libro.
  Así no tiene que adivinar. Lo vemos en el siguiente video.
:::
"""

M2_PASALE_LA_PAGINA = """
1. Abre la página de tu libro y sácale una captura o una foto.
2. En Gemini, haz clic en el + (en la web se llama «Subidas y herramientas») y súbela. Si son varias páginas, júntalas en una sola imagen: con tres imágenes sueltas, Gemini se quedó colgado.
3. En el pedido, di que use solo lo que está en esa página y con los mismos nombres.
4. Si tu hoja necesita datos, pide que deje el hueco entre corchetes. El dato lo pones tú.

En el celular: toca el + junto a la caja de texto y elige la cámara. Le tomas la foto a la página ahí mismo.

:::ejemplo El pedido de Andrés
Eres docente de Lengua de 2.º de Bachillerato en un colegio fiscal de Manta. Te adjunto las páginas del libro del Ministerio sobre tipos de argumento.
Usa solo los tipos de argumento que aparecen en esas páginas, con el mismo nombre que usa el libro.
Escribe seis argumentos cortos, de dos o tres líneas, sobre si el colegio debería pedir uniforme todos los días. Cada uno de un tipo distinto.
Debajo, una tabla para mí con el tipo de cada argumento y la frase de las páginas que lo justifica.
Tengo 40 minutos de clase. No inventes datos ni cifras: si un argumento necesita una cifra, déjala entre corchetes para que yo la ponga.
:::
"""

M2_LA_PAGINA_NO_EL_NOMBRE = """
Gemini aprendió de millones de textos, y de ahí saca la lista de tipos de argumento que más se repite. Esa no es la de tu libro. El libro de 2.º BGU enseña siete: datos, citas de autoridad, ejemplo, experiencia personal, analogía, verdades universales y causa y consecuencia. El indicador del currículo trae otra lista. Gemini tiene una tercera.

Si le das el nombre del libro, adivina qué dice. Si le das la página, lo lee.

Debajo va un recorte de la respuesta real del video anterior.

:::ejemplo Esperamos: la respuesta real de Gemini con la página (recortada)
Datos contables: Según una encuesta local, las familias gastan un [ ]% menos de su presupuesto anual en ropa escolar cuando se exige uniforme todos los días. Mantener esta medida protege la economía de los hogares de Manta.

Citas, frases célebres. Argumentos de autoridad: Como afirma la pedagogía moderna, "el uniforme escolar es una herramienta igualadora que borra barreras socioeconómicas". Exigirlo a diario garantiza que esta equidad se mantenga constante.

| Tipo de argumento según el texto | Frase del libro que lo justifica |
|---|---|
| Datos contables | "Uno de los argumentos a los que más se recurre para sustentar tesis es el dato numérico, pues es de apariencia contrastable." |
| Citas, frases célebres. Argumentos de autoridad | "Para sustentar una tesis propia, se puede recurrir a palabras de personajes prestigiosos o reconocidos." |
:::

Dos límites:
- Gemini puede leer mal una foto torcida o con sombra. Que se vea la página entera y derecha.
- Aunque le pases la página, a veces cambia un nombre o mete un tipo que no está. Por eso se sigue revisando.

Regla práctica: si en tu clase un concepto tiene un nombre, pásale a Gemini la página donde aparece con ese nombre.
"""

M2_QUE_TE_PREGUNTE = """
Cuando no sabes qué contarle, pídele que te pregunte. Escribe qué quieres y añade: «Antes de proponer nada, hazme las preguntas que necesites. Una por una.»

Sirve además para aprender: las preguntas que te hace son las piezas que le faltaban a tu pedido. Después de dos o tres veces, las vas a poner sin que te las pida.

Si Gemini no pregunta y contesta de una vez, vuelve a escribir: «Te pedí que me preguntes primero. Hazme la primera pregunta.»

:::ejemplo El pedido
Quiero preparar una clase de 40 minutos sobre tipos de argumento para mi 2.º de Bachillerato.
Antes de proponer nada, hazme las preguntas que necesites para que la clase sirva para mi curso.
Una por una, y espera mi respuesta antes de la siguiente.
:::
"""

M2_REVISA_TU = """
Un error por pregunta, tomados de lo que suele salir en la hoja del video 2.3.

:::pregunta En la tabla, Gemini pone como argumento de «experiencia personal»: «El uniforme es incómodo y punto». ¿Qué pasa?
- [ ] Nada, es una experiencia personal.
  Es lo que alguien siente, pero no da ninguna razón. Así, es una opinión.
- [x] Es una opinión sin razón, no un argumento.
  Es lo mismo que confunden los chicos de Andrés (libro, pp. 21-24). Si la clave lo da por bueno, refuerza el error.
- [ ] Está bien, pero falta la cifra.
  El problema no es la cifra. Aunque tuviera un número, sigue sin decir por qué.
:::

:::pregunta El argumento de datos dice: «En el colegio, el [porcentaje] de los estudiantes no puede comprar dos uniformes». ¿Qué hace Andrés?
- [ ] Lo imprime así, para que los chicos lo completen.
  No tienen de dónde sacar ese dato. Van a inventar uno.
- [x] Busca el dato real o cambia el argumento por uno que no necesite cifra.
  Para eso sirve el hueco: te avisa qué tienes que buscar tú.
- [ ] Le pide a Gemini que complete el porcentaje.
  Te va a dar un número que suena bien. Es el mismo problema del 15 % del módulo 1.
:::

:::pregunta ¿Cuándo conviene pedirle a Gemini que te pregunte primero?
- [ ] Siempre, para cualquier pedido.
  Si ya sabes qué quieres y lo escribes, te ahorras cinco preguntas.
- [x] Cuando no tienes claro qué contarle, o es la primera vez que pides algo así.
  Sus preguntas te muestran qué le falta. La próxima vez lo escribes de entrada.
- [ ] Nunca, porque se demora más.
  Se demora un par de minutos más, y a cambio la clase sale para tu curso.
:::
"""

M2_REVISAR_CON_EL_LIBRO = """
En el video, la respuesta de Gemini queda a un lado y la página del libro al otro: es la forma más rápida de revisar. Andrés recorre la tabla tipo por tipo, comprueba que cada uno esté en la página con el mismo nombre, lee cada argumento para ver si da una razón o es una opinión, y corrige en el mismo chat lo que encuentra.

Con la página, el error es más chico y se encuentra más rápido. Pero se sigue buscando.
"""

M2_PARA_EL_LUNES = """
Esta semana prepara una hoja con una página de tu libro. Pásasela a Gemini y revisa con la página al lado.

La próxima semana cambiamos el punto de partida: en vez de pedir una clase sobre un tema, vamos a pedirla desde la destreza que tienes que trabajar.
"""

MODULE_2_LESSONS: list[Lesson] = [
    _video("¿Cómo te fue?", 35, M2_COMO_TE_FUE, "2-1-como-te-fue"),
    _text("Antes de empezar", 120, M2_ANTES),
    _video("Pásale la página del libro", 80, M2_PASALE_LA_PAGINA, "2-3-pasale-la-pagina"),
    _video(
        "Por qué la página y no el nombre del libro",
        73,
        M2_LA_PAGINA_NO_EL_NOMBRE,
        "2-4-la-pagina-no-el-nombre",
    ),
    _video("Que Gemini te pregunte primero", 76, M2_QUE_TE_PREGUNTE, "2-5-que-te-pregunte"),
    _text("Revisa tú", 180, M2_REVISA_TU),
    _video("Revisar con el libro al lado", 63, M2_REVISAR_CON_EL_LIBRO, "2-7-revisar-con-el-libro"),
    _video("Para el lunes", 19, M2_PARA_EL_LUNES, "2-9-para-el-lunes"),
]

# ---------------------------------------------------------------------------
# Módulo 3: Empezar por la destreza
# ---------------------------------------------------------------------------

M3_COMO_TE_FUE = """
¿Le pasaste una página de tu libro a Gemini? ¿Cambió algo en lo que te devolvió?

Hasta ahora le pedimos hojas. Si le pides una clase entera, pasa otra cosa: te arma una clase donde tú hablas y ellos escuchan, y al final no sabes si aprendieron.

Hoy empezamos al revés. Primero decides qué tendría que hacer un estudiante para demostrarte que lo logró. Después armas la clase para llegar ahí.
"""

M3_ANTES = """
:::pregunta Al final de la clase, ¿cuál de estas cosas le muestra a Andrés que sus estudiantes saben defender una tesis con argumentos?
- [ ] Que levanten la mano cuando pregunta si entendieron.
  Casi todos dicen que sí. No le dice quién lo logró.
- [ ] Que copien en el cuaderno los siete tipos de argumento.
  Muestra que copiaron la lista. Defender una tesis es otra cosa.
- [x] Que cada uno escriba un párrafo con una tesis y dos argumentos de tipos distintos, y diga cuáles usó.
  Eso lo puede leer y ver quién lo logró y quién todavía confunde una opinión con un argumento.
:::

:::pregunta ¿Dónde está la destreza que tiene que trabajar Andrés esta semana?
- [ ] En el índice del libro.
  El libro trae los temas. La destreza con su código está en el currículo.
- [x] En su planificación, con el código del currículo (por ejemplo, LL.5.4.2).
  Es la misma que ya pone en su planificación. Ahora también va en el pedido.
- [ ] Gemini la conoce si le das el grado.
  Puede inventar una que suene bien. El texto se lo pasas tú.
:::
"""

M3_TEMA_O_DESTREZA = """
Dos chats, el mismo docente, dos pedidos. El primero parte del tema; el segundo, de la destreza.

:::ejemplo Pedido A: desde el tema
Hazme una clase sobre tipos de argumento para 2.º de Bachillerato.
:::

:::ejemplo Pedido B: desde la destreza
Doy Lengua en 2.º de Bachillerato en un colegio fiscal de Manta. Mis estudiantes ya saben qué es una tesis, pero confunden un argumento con una opinión.
Esta es la destreza que tengo que trabajar: LL.5.4.2. Defender una tesis mediante la formulación de diferentes tipos de argumentos.
Todavía no quiero la clase. Dime qué podría hacer un estudiante al final de 40 minutos que me demuestre que lo logró. Dame tres opciones, de la más simple a la más completa, y que cada una se pueda revisar en menos de un minuto por estudiante.
Usa solo estos tipos de argumento, que son los del libro: datos contables; citas, frases célebres o argumentos de autoridad; ejemplo; experiencia personal; analogía; verdades universales; causa y consecuencia.
:::

Mientras miras, cuenta cuántos minutos habla el docente en la primera respuesta, cuántos hacen algo los estudiantes, y si al final hay algo que puedas revisar.
"""

M3_DESTREZA_EVIDENCIA_CLASE = """
Una clase se puede pedir de dos formas:
1. **Desde el tema:** «una clase sobre tipos de argumento». Gemini devuelve lo más común: una explicación, ejemplos y una actividad. Casi nunca termina con algo que el docente pueda revisar.
2. **Desde la destreza:** primero qué tiene que poder hacer el estudiante, después qué haría para demostrarlo, y al final la clase para llegar ahí.

Debajo van recortes de las dos respuestas reales del video anterior.

:::ejemplo Esperamos: la respuesta al pedido A (desde el tema), recortada
Apertura: «Para dominar el texto argumentativo en 2.º de Bachillerato, es fundamental conocer no solo qué es una tesis, sino con qué herramientas la vamos a defender. Esas herramientas son los argumentos.»

Ejemplo de argumento de datos que trae: «El 70 % de los jóvenes menores de 25 años declara sufrir ansiedad debido al uso constante de las redes sociales, tal y como refleja el último barómetro del CIS».
:::

:::ejemplo Esperamos: la respuesta al pedido B (desde la destreza), recortada
Aquí tienes tres opciones de actividades de cierre (entregables o "tickets de salida") diseñadas para realizarse en los últimos 5 a 10 minutos de la clase. Cada una te permite comprobar si lograron la destreza y se califica con un vistazo rápido.

Opción 1: El filtro (La más simple - Reconocimiento). Recibe un papelito con una tesis (ej. "Se debe cuidar la playa El Murciélago") y cuatro oraciones breves. Una de ellas es una simple opinión ("Yo creo que la playa es bonita") y las otras tres son argumentos reales. El estudiante debe tachar la opinión y escribir al lado de las otras tres qué tipo de argumento es, eligiendo solo de tu lista oficial. [...] Tiempo de revisión: 10 segundos por estudiante.
:::

La evidencia la eliges tú. Gemini propone opciones, pero no sabe cuánto tiempo tienes para revisar 35 cuadernos ni qué te sirve para la clase siguiente.

Regla práctica: no le pidas la clase hasta saber qué vas a revisar al final.
"""

M3_DE_LA_EVIDENCIA_A_LA_CLASE = """
Ahora sí se pide la clase, en el mismo chat, para llegar a la opción elegida. Los últimos 15 minutos son para que los estudiantes escriban en clase, no de deber, para que no lo haga la IA por ellos. Y se pide que separe lo que hace el docente de lo que hacen ellos: así se ve de una vez si el docente habla toda la hora.

:::ejemplo El pedido
Me quedo con la opción [número]. Arma la clase de 40 minutos para llegar a eso. Los últimos 15 minutos son para que la escriban en clase.
Para cada momento dime cuántos minutos dura, qué hago yo y qué hacen ellos.
:::
"""

M3_REVISA_TU = """
Un error por pregunta.

:::pregunta Andrés suma los minutos de la clase que le devolvió Gemini: 5 + 10 + 15 + 15 = 45. ¿Qué hace?
- [ ] Nada, son solo cinco minutos más.
  En una hora de 40, cinco minutos son la parte en que escriben. Si falta tiempo, es lo primero que se corta.
- [x] Le pide que la ajuste a 40, sin tocar los 15 minutos del final.
  Los minutos casi nunca suman bien. Se suman siempre, y lo que se protege es la parte de la evidencia.
- [ ] Le pide a Gemini que confirme si suma 40.
  Te puede decir que sí. Súmalo tú.
:::

:::pregunta La clase dice: «Momento 2 (15 min): el docente explica los siete tipos de argumento con ejemplos». ¿Qué problema tiene?
- [ ] Ninguno, hay que explicarlos.
  Hay que explicarlos, pero quince minutos seguidos hablando es mucho, y siete tipos de una vez es mucho para una hora.
- [x] Son quince minutos en que los estudiantes solo escuchan, con siete tipos de una vez.
  Puedes pedir que explique dos o tres tipos y que ellos clasifiquen ejemplos entre medio.
- [ ] Debería durar más.
  Más minutos explicando dejan menos para que escriban, que es lo que vas a revisar.
:::

:::pregunta La evidencia que propone Gemini es: «Los estudiantes reflexionan sobre la importancia de argumentar». ¿Sirve?
- [ ] Sí, reflexionar es importante.
  Lo es, pero no hay nada que leer al final. No sabes quién lo logró.
- [x] No, porque no deja nada que se pueda revisar.
  Una evidencia es algo que el estudiante hace y tú puedes ver: un párrafo, una tabla, una respuesta.
- [ ] Sí, si se hace en grupo.
  En grupo, sigue sin quedar nada escrito de cada uno.
:::
"""

M3_REVISAR_LA_CLASE = """
Antes de usar una clase que te armó Gemini:
1. **Suma los minutos.** Tú, no Gemini.
2. **Mira qué hacen ellos en cada momento.** Si escuchan más de diez minutos seguidos, pide que lo parta con algo que hagan ellos.
3. **Revisa el final.** Tiene que terminar con la evidencia que elegiste, hecha en clase.
"""

M3_PARA_EL_LUNES = """
Elige una destreza de tu planificación de esta semana. Pídele a Gemini tres evidencias, elige una y arma la clase para llegar ahí.

La próxima semana le pasamos a Gemini tu unidad entera, no una página, y vemos cómo comprobar de dónde saca cada cosa.
"""

MODULE_3_LESSONS: list[Lesson] = [
    _video("¿Cómo te fue?", 33, M3_COMO_TE_FUE, "3-1-como-te-fue"),
    _text("Antes de empezar", 120, M3_ANTES),
    _video(
        "Pedir desde el tema y desde la destreza", 74, M3_TEMA_O_DESTREZA, "3-3-tema-o-destreza"
    ),
    _video(
        "Destreza, evidencia y clase",
        56,
        M3_DESTREZA_EVIDENCIA_CLASE,
        "3-4-destreza-evidencia-clase",
    ),
    _video(
        "De la evidencia a la clase",
        52,
        M3_DE_LA_EVIDENCIA_A_LA_CLASE,
        "3-5-de-la-evidencia-a-la-clase",
    ),
    _text("Revisa tú", 180, M3_REVISA_TU),
    _video("Revisar la clase", 54, M3_REVISAR_LA_CLASE, "3-7-revisar-la-clase"),
    _video("Para el lunes", 20, M3_PARA_EL_LUNES, "3-9-para-el-lunes"),
]

# ---------------------------------------------------------------------------
# Curso y talleres
# ---------------------------------------------------------------------------

GEMINI_LIBRO_COURSE: dict[str, Any] = {
    "slug": SLUG,
    "title": "Preparar tu clase con Gemini y tu libro",
    "summary": "Del pedido corto a una clase que termina con algo que puedes revisar",
    "description": (
        "Sigues a Andrés, docente de Lengua de 2.º de Bachillerato en un colegio fiscal de Manta, "
        "mientras prepara una hoja y una clase con Gemini. Aprendes a escribir el pedido, a pasarle "
        "la página de tu libro para que use tus palabras y a pedir primero qué van a hacer tus "
        "estudiantes para demostrarte que lo lograron. Cada respuesta se revisa antes de llevarla al aula."
    ),
    "level": "beginner",
    "modules": [
        ("Tu primera hoja con Gemini", MODULE_1_LESSONS),
        ("Que use tu libro", MODULE_2_LESSONS),
        ("Empezar por la destreza", MODULE_3_LESSONS),
    ],
}

GEMINI_LIBRO_ACTIVITIES: list[dict[str, Any]] = [
    {
        "course_slug": SLUG,
        "module_position": 1,
        "title": "Taller 1: tu hoja para la próxima clase",
        "statement": (
            "Escribe el pedido de una hoja para tu próxima clase, o de una que ya usas y quieres "
            "mejorar. Empieza con «Eres docente de [materia] de [grado]» y el lugar donde enseñas.\n\n"
            "Usa las cinco piezas del módulo: qué saben tus estudiantes y en qué se equivocan, qué hoja "
            "necesitas y para qué, cuánto dura tu hora de clase y cómo quieres recibirla. Di también qué "
            "no debe hacer, por ejemplo inventar datos o cifras.\n\n"
            "No incluyas nombres, notas ni datos de tus estudiantes."
        ),
        "checks": {
            "requires_role": True,
            "requires_format": True,
            "required_terms": [
                ["grado", "curso", "año", "bachillerato", "egb", "bgu"],
                ["minutos", "hora de clase", "tiempo"],
                ["no inventes", "inventes", "invente", "inventar"],
            ],
            "min_length": 40,
        },
    },
    {
        "course_slug": SLUG,
        "module_position": 2,
        "title": "Taller 2: tu hoja con tu libro",
        "statement": (
            "Escribe el pedido de una hoja de tu materia usando una página de tu libro. Empieza con "
            "«Eres docente de [materia] de [grado]» y el lugar donde enseñas.\n\n"
            "El pedido tiene que decir que adjuntas la página, que Gemini use solo lo que aparece ahí y "
            "con los mismos nombres, cuánto dura tu clase y cómo quieres recibir la hoja. Si un dato hace "
            "falta, pide que deje el hueco entre corchetes para ponerlo tú: no debe inventar cifras.\n\n"
            "Este taller solo recibe texto. En lugar de subir la imagen, escribe en el pedido la lista o "
            "la definición del libro tal como está en la página. No incluyas datos de tus estudiantes."
        ),
        "checks": {
            "requires_role": True,
            "requires_format": True,
            "required_terms": [
                ["página", "pagina", "libro"],
                ["solo con lo de la página", "solo", "únicamente", "unicamente"],
                ["corchetes", "inventes", "invente", "inventar"],
                ["minutos", "hora de clase", "tiempo"],
            ],
            "min_length": 40,
        },
    },
    {
        "course_slug": SLUG,
        "module_position": 3,
        "title": "Taller 3: tu clase desde tu destreza",
        "statement": (
            "Escribe el pedido de una evidencia para una destreza de tu planificación. Empieza con "
            "«Eres docente de [materia] de [grado]» y el lugar donde enseñas.\n\n"
            "Pega la destreza con su código y su texto completo, tal como está en tu planificación; no "
            "escribas un código que no tengas delante. Cuenta qué saben ya tus estudiantes y en qué se "
            "equivocan, y di cuántos minutos tiene la clase.\n\n"
            "Pide primero la evidencia, no la clase: qué podría hacer un estudiante al final para "
            "demostrarte que lo logró, en varias opciones y revisables en poco tiempo por estudiante. "
            "No incluyas datos de tus estudiantes."
        ),
        "checks": {
            "requires_role": True,
            "requires_format": True,
            "required_terms": [
                ["destreza"],
                ["evidencia"],
                ["minutos", "hora de clase", "tiempo"],
                ["todavía no", "todavia no", "antes de la clase", "primero"],
            ],
            "min_length": 45,
        },
    },
    {
        "course_slug": SLUG,
        "module_position": 3,
        "title": "Taller 4 · Examen final: la clase de tu próxima semana",
        "statement": (
            "Escribe el pedido completo para preparar una clase de tu próxima semana, con todo lo del "
            "curso. Empieza con «Eres docente de [materia] de [grado]» y el lugar donde enseñas.\n\n"
            "Copia la destreza de tu planificación y di qué tendría que hacer un estudiante al final para "
            "demostrar que la logró. Escribe en el pedido la lista o la definición de tu libro, y pide que "
            "use solo eso, con los mismos nombres. Pide la clase con los minutos de cada momento, qué haces "
            "tú y qué hacen ellos, y que termine con algo escrito en clase que puedas revisar.\n\n"
            "Si hace falta un dato, que deje el hueco entre corchetes: no debe inventar cifras ni fuentes. "
            "No incluyas nombres, notas ni datos de tus estudiantes."
        ),
        "checks": {
            "requires_role": True,
            "requires_format": True,
            "required_terms": [
                ["destreza"],
                ["libro", "página", "pagina"],
                ["minutos", "hora de clase", "tiempo"],
                ["corchetes", "inventes", "invente", "inventar"],
            ],
            "min_length": 60,
        },
    },
]
