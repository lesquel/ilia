"""Ruta docente que el seed publica en el catálogo.

El texto se puede estudiar sin vídeo. Los guiones para grabar viven en
`docs/curriculum/ruta-docentes.md`. Cuando el vídeo exista, la lección
cambia de tipo en el panel de instructor; este cuerpo queda como lectura.
"""

from typing import Any

# (title, kind, duration_seconds, body)
Lesson = tuple[str, str, int, str]
Module = tuple[str, list[Lesson]]


def _minutes(n: int) -> int:
    return n * 60


PROMPTING_LESSONS_M1: list[Lesson] = [
    (
        "Un pedido de una línea",
        "text",
        _minutes(5),
        "Norma da lengua en séptimo — 7.º de EGB, el último de Media — "
        "en un colegio fiscal de la costa. "
        "Necesita una hoja para la clase de mañana y le pide a un modelo "
        "que se la escriba. Escribe una sola línea: «Hazme una lectura de "
        "séptimo, bien creativa, con varias preguntas.»\n\n"
        "Con esa línea el modelo tiene que decidir dos cosas que ella no "
        "dijo: qué es «una lectura» y qué es «séptimo». Esas decisiones no "
        "las toma con el curso de Norma, porque no lo conoce. Las toma con "
        "un promedio de internet, y ahí «lectura de séptimo» puede ser una "
        "receta, un cuento de animalitos o un ensayo con tesis.\n\n"
        "Su curso leyó un cuento la semana pasada y varios todavía dicen "
        "«el que cuenta» en lugar de narrador. Nada de eso está en el "
        "pedido, así que el modelo no lo puede usar. Lo que devuelve no se "
        "puede leer en voz alta ni contestar con el texto: no le sirve "
        "para la hora de mañana.\n\n"
        "Norma borra esa línea y escribe el pedido completo. Abajo están "
        "los dos, con lo que devuelve cada uno. En la lección siguiente "
        "vemos por qué el modelo elige mal cuando le falta un dato, y "
        "después armamos las piezas de un pedido que sí sirve.",
    ),
    (
        "Qué ocurre",
        "text",
        _minutes(5),
        "El modelo no estuvo en tu aula. Predice texto que suena bien, y "
        "nada más. No sabe quién faltó, ni qué vieron la semana pasada, ni "
        "si en tu libro dicen «narrador» o «el que cuenta».\n\n"
        "Cuando le falta un dato no pregunta: lo rellena. Por eso un "
        "pedido vago casi nunca devuelve una hoja de tu grado. No es que "
        "el modelo falle, es que rellenó lo que tú no le dijiste.\n\n"
        "Por eso sirve para:\n"
        "• Borradores de guías, ejemplos y preguntas.\n"
        "• Reformular al nivel de tus estudiantes.\n"
        "• Proponer un formato (tabla, lista, carta a familias).\n\n"
        "Y no sirve, solo, para:\n"
        "• Certificar que un estudiante aprendió.\n"
        "• Inventar datos de un capítulo que no le diste.\n"
        "• Decidir la nota del bimestre.\n\n"
        "Tampoco puede inventar una fuente. Si dice «según el Ministerio» "
        "y tú no pegaste el decreto, esa cita es teatro. Si te asegura que "
        "el ochenta por ciento de séptimo ya distingue el tema de las "
        "ideas, es falso: en Media, Lengua, 2024-25, el promedio es "
        "682 / 61,9 % bajo 700. Esa cifra no la inventó este curso, y "
        "terminarlo no sube Ser Estudiante.\n\n"
        "En el curso de Norma faltó un estudiante la semana pasada, y el "
        "modelo no tiene forma de saberlo. Si ella no lo escribe en el "
        "pedido, no existe. Y nada de lo que devuelve se manda a copias "
        "sin leerlo: un error en una guía de séptimo se vuelve error de "
        "veinte cuadernos.",
    ),
    (
        "Las cinco piezas",
        "text",
        _minutes(7),
        "Un pedido que sirve tiene cinco piezas. No es una plantilla que "
        "haya que llenar: cada pieza es un dato que, si falta, el modelo "
        "rellena por su cuenta. Se escriben seguidas, como le hablarías a "
        "un colega que entra a cubrirte la hora.\n\n"
        "Quién es. «Eres docente de lengua de séptimo en un colegio fiscal "
        "de la costa.» Sin eso, el modelo responde como un tutor de "
        "internet que nunca vio un aula.\n\n"
        "Para quién. La hoja es para el estudiante, no para la familia ni "
        "para el suplente. «Se lee en voz alta, en clase, y la contestan "
        "ellos.»\n\n"
        "Qué ya vieron y qué no debe salir. «Ya leyeron un cuento y hay "
        "quienes todavía confunden al narrador con el protagonista. No "
        "inventes el autor. No me lo devuelvas como receta ni como "
        "ensayo.»\n\n"
        "Qué tienen que saber hacer. El nombre del tema no alcanza: "
        "«lectura» lo puede entender como receta o como ensayo de "
        "bachillerato. En séptimo es un párrafo con una sola idea y cinco "
        "preguntas que se contestan con el texto.\n\n"
        "Cuántos y cómo lo quieres de vuelta. «El párrafo primero y, "
        "debajo, las cinco preguntas con su respuesta.» Si no lo dices, te "
        "llega todo mezclado y lo tienes que reordenar a mano.\n\n"
        "Norma escribió las cinco. Abajo está el pedido entero: cada frase "
        "corresponde a una pieza, y ninguna está de adorno. Lo mismo vale "
        "en matemática o en sociales: di el período exacto y di lo que no "
        "quieres.\n\n"
        "Si en tu planificación aparece un código del ministerio, lo "
        "puedes pegar al final. En esta hoja de séptimo es LL.3.3.3: "
        "Inferir y sintetizar el contenido esencial: tema vs ideas "
        "principales. No lo pongas de título: la clase es el párrafo y "
        "las cinco preguntas.\n\n"
        "Si varios todavía no distinguen la idea, no bajes a una receta "
        "ni subas a un ensayo. Un peldaño antes: parafrasear, releer, "
        "preguntar, leer selectivamente. Eso es LL.3.3.4. Si no tienes "
        "el código a mano, no pasa nada: ya dijiste la tarea con tus "
        "palabras.",
    ),
    (
        "El recuadro",
        "text",
        _minutes(6),
        "Cuando le pegas un párrafo o un capítulo, el modelo no distingue "
        "solo dónde termina tu instrucción y dónde empieza el texto. Si "
        "van seguidos, los mezcla: un nombre o una nota que iban dentro "
        "del texto terminan leídos como parte de la consigna.\n\n"
        "La solución es un recuadro. Tu pedido va afuera, el texto va "
        "adentro entre dos líneas, y cierras con la orden que evita el "
        "invento: si un dato no está ahí, que escriba que no está.\n\n"
        "Ese recuadro sirve además para mostrar el tono. Una instrucción "
        "más no siempre ayuda; un ejemplo sí, porque le muestras cómo se "
        "ve un buen resultado en vez de describírselo. Con dos ejemplos "
        "basta: con cinco empieza a copiar un patrón que no pediste.\n\n"
        "Dentro del recuadro va contenido, nunca un expediente. El nombre "
        "del estudiante, sus notas y cualquier dato que lo identifique se "
        "quedan fuera.\n\n"
        "Norma usa un párrafo suyo del año pasado: Juana en el mercado de "
        "Tarqui y el hijo que anota lo que compraron. Abajo está el "
        "recuadro ya armado, con las preguntas que devuelve.",
    ),
    (
        "Adjuntar tus archivos",
        "text",
        _minutes(6),
        "Casi todos los modelos ya aceptan archivos, y eso cambia el "
        "trabajo: en vez de describirle tu material, se lo entregas. Con "
        "el capítulo adjunto el modelo deja de adivinar qué dice el texto "
        "y trabaja con el tuyo, que es el que van a leer tus estudiantes.\n\n"
        "Ayuda bastante, así que vale la pena saber qué conviene adjuntar. "
        "El capítulo que van a leer, en PDF o en Word. Tu planificación de "
        "la unidad, para que respete el orden que ya tienes. La rúbrica con "
        "la que vas a calificar. Y una hoja tuya del año pasado, cuando "
        "quieres que el tono y el largo se parezcan a esa.\n\n"
        "El pedido cambia poco. Le dices que use solo lo adjunto, que "
        "indique de qué página salió cada respuesta y que escriba «no está "
        "en el archivo» cuando no lo encuentre. Sin esa última orden "
        "rellena los huecos con internet, igual que antes.\n\n"
        "Con uno o dos archivos alcanza. Si le subes veinte, mezcla "
        "capítulos y ya no puedes rastrear de dónde salió cada frase. Y si "
        "adjuntas una foto del libro, revisa que se lea bien: de una foto "
        "borrosa saca palabras que no están escritas.\n\n"
        "Lo que no se adjunta: listas de notas con nombres, cédulas, fotos "
        "de estudiantes, diagnósticos ni capturas del chat de familias. El "
        "material de clase es el contenido, no el expediente. Si necesitas "
        "un escrito de estudiante como ejemplo, quítale el nombre y el "
        "curso primero.\n\n"
        "Norma adjunta el PDF del capítulo y su planificación, y pide las "
        "preguntas con la página al lado. Abajo está ese pedido y lo que "
        "devuelve, incluida la línea que admite lo que no encontró.",
    ),
]

PROMPTING_LESSONS_M2: list[Lesson] = [
    (
        "La hoja completa",
        "text",
        _minutes(8),
        "Pedir «hazme una guía» devuelve una guía de catálogo: sin tiempo, "
        "sin nivel y sin lo que ya vieron tus estudiantes. Son las mismas "
        "piezas que faltaban en el pedido de una línea, y el modelo las "
        "rellena igual.\n\n"
        "Una guía que sí puedes proyectar en clase necesita cuatro cosas "
        "dichas:\n"
        "• el curso y el grado;\n"
        "• qué ya vieron y qué no;\n"
        "• cuántos ítems y cómo se reparte la dificultad;\n"
        "• dónde va la clave de respuestas, para no adelantarla al "
        "proyectar.\n\n"
        "Norma ya tiene el párrafo y ahora quiere la hoja entera: seis "
        "preguntas de más fácil a más difícil y las respuestas aparte. "
        "Escribe esas cuatro cosas con el temario abierto, en el mismo "
        "pedido.\n\n"
        "Si el primer resultado sale largo, no lo empieza de nuevo: pide "
        "un solo cambio. «Acorta los enunciados, se leen en voz alta.» "
        "Abajo está el pedido armado y la hoja que devuelve.",
    ),
    (
        "Un resumen para alguien",
        "text",
        _minutes(5),
        "«Resúmeme esto» devuelve un resumen de nadie. Un docente casi "
        "siempre necesita el resumen **para alguien**: el que faltó, el "
        "que no leyó el capítulo, o la familia que pregunta qué vieron en "
        "clase.\n\n"
        "La estructura es la misma en los dos casos: dices para quién es y "
        "para qué lo vas a usar. Cambia el destinatario y cambia el "
        "resultado, aunque el texto de origen sea idéntico.\n\n"
        "Para el estudiante que faltó: cinco viñetas, cada una con una "
        "idea y una pregunta de comprensión, sin jerga que el texto no "
        "explique.\n\n"
        "Para las familias: ocho líneas con lo que vieron y una pregunta "
        "que puedan hacer en casa, en tono respetuoso y sin siglas. Ese "
        "mensaje lo escribes tú para adultos; no es un deber del "
        "estudiante.\n\n"
        "En el curso de Norma faltó un estudiante, así que ella pide las "
        "dos salidas en la misma sesión. Si pega un texto largo, dice "
        "también qué ignorar: los ejemplos de otro país y los precios en "
        "otra moneda.",
    ),
    (
        "Cuarenta y cinco minutos",
        "text",
        _minutes(5),
        "El modelo no siente el reloj. Si no le dices cuánto dura la hora, "
        "te arma una secuencia de dos horas con actividades que suenan bien "
        "y no caben en el período.\n\n"
        "La hora se pide por bloques que suman 45 minutos: ocho de "
        "apertura, veinte de práctica guiada, doce de trabajo individual y "
        "cinco de cierre. En cada bloque se dice qué hace el docente y qué "
        "hace el estudiante, porque si no te devuelve una lista de temas "
        "en vez de una clase.\n\n"
        "Después revisas la suma. Si los bloques no dan 45, el modelo "
        "improvisó: se lo pides otra vez, con esas palabras, y corrige.\n\n"
        "A Norma le devolvió dos horas la primera vez. Una hora que sí "
        "suma 45 le sirve más que una clase de diez páginas que nadie "
        "puede dar completa.",
    ),
    (
        "El primer borrador no se fotocopia",
        "text",
        _minutes(5),
        "Lo que devuelve el modelo es un borrador, no la hoja final. El "
        "primer tiro casi nunca se fotocopia tal cual, y eso no es una "
        "falla: es la parte del trabajo que te toca a ti.\n\n"
        "Se corrige una cosa por pasada. Si pides todo junto, el modelo "
        "arregla una y rompe otra. Y si no puedes decir qué cambió en esta "
        "pasada, no iteraste: solo volviste a pedir «hazlo mejor».\n\n"
        "Una pasada es tan concreta como esto: acorta los enunciados; tres "
        "más fáciles y tres más difíciles; quita los ejemplos de otro "
        "país; reescribe las instrucciones para que un estudiante las lea "
        "solo.\n\n"
        "A Norma las preguntas le salieron largas, de las que no se pueden "
        "dictar. Pide un solo cambio: que las acorte porque se leen en voz "
        "alta, y que no toque el párrafo. El modelo propone; ella firma lo "
        "que entra al aula.",
    ),
]

PROMPTING_LESSONS_M3: list[Lesson] = [
    (
        "Antes de fotocopiar",
        "text",
        _minutes(4),
        "Un error en la clave o un autor inventado se vuelve error de "
        "veinte cuadernos. Por eso la hoja no se manda a copias sin "
        "leerla.\n\n"
        "Son cinco chequeos, siempre:\n"
        "1. ¿Aparece un dato que tú no diste? Un autor, una fecha, un "
        "ejemplo de otro país. Si no lo puedes señalar en tu material, "
        "sácalo.\n"
        "2. ¿Hay un «según el Ministerio» que no pegaste? Sin el PDF, "
        "esa referencia no existe.\n"
        "3. ¿El nivel es el de tu grado? Una «lectura de séptimo» que "
        "pide un ensayo con tesis no sirve. Tampoco una receta. Si la "
        "hoja quedó dura, el peldaño es parafrasear y releer (LL.3.3.4), "
        "no un cuento de animalitos.\n"
        "4. ¿El ejemplo asume otra vida? Precios en dólares, nieve, un "
        "barrio que tus estudiantes no conocen.\n"
        "5. ¿Hay algo que un estudiante podría copiar como si fuera "
        "verdad y está mal? Un error en la clave es el más caro.\n\n"
        "Si el modelo se niega a poner la clave o la pone mal, no insistas "
        "diez veces: la escribes tú. El ahorro de tiempo está en el "
        "borrador, no en delegar la verdad.\n\n"
        "Norma pasa su hoja por esos cinco chequeos. Abajo ves lo que "
        "habría mandado a copias sin revisarla y lo que queda después.\n\n"
        "Ahora te toca a ti. En el laboratorio escribes el pedido de TU "
        "próxima clase, con las cinco piezas. Eso es la evidencia del "
        "curso.",
    ),
]

NOTEBOOK_LESSONS_M1: list[Lesson] = [
    (
        "Por qué trabaja con tus fuentes",
        "text",
        _minutes(6),
        "Un chat abierto responde con lo que «sabe» de internet. "
        "NotebookLM responde, sobre todo, con lo que **tú** le cargas. "
        "Esa limitación es la ventaja en un colegio: no quieres un "
        "ejemplo en euros ni un capítulo de otro libro.\n\n"
        "Sirve cuando el material ya existe: PDF del texto, tus apuntes, "
        "la planificación, un decreto o el proyecto de aula.\n\n"
        "No sirve si el cuaderno está vacío. Tampoco si cargas 40 PDFs "
        "sin criterio: el modelo mezcla y tú no sabes de dónde salió "
        "cada frase.\n\n"
        "Cuando responda, abre la cita. Una marca al margen no prueba "
        "que el párrafo dice eso: léelo. Si el número, el nombre o el "
        "año no están en el PDF, se tira.\n\n"
        "Regla práctica: si no está en tus archivos, no debería estar "
        "en la guía.",
    ),
    (
        "Qué cargar y qué no",
        "text",
        _minutes(5),
        "Carga contenido. No cargues personas.\n\n"
        "Sí: capítulo, apuntes, rúbrica, planificación, un artículo "
        "que van a leer. En el pedido di el grado y qué tienen que "
        "saber hacer. El modelo no adivina el aula.\n\n"
        "No: listas con nombres y notas, fotos de menores, chats de "
        "familias, diagnósticos, documentos con cédulas. Aunque la "
        "herramienta «sea de Google», el expediente de un estudiante "
        "no es material de clase.\n\n"
        "Si necesitas ejemplos de escritos de estudiantes, anonimiza: "
        "quita el nombre, el curso y cualquier dato que los identifique. "
        "Tres párrafos anónimos bastan para practicar una rúbrica.\n\n"
        "Empieza con un solo capítulo. Un cuaderno gordo es un cuaderno "
        "que no vas a revisar.",
    ),
]

NOTEBOOK_LESSONS_M2: list[Lesson] = [
    (
        "Una clase completa desde tu capítulo",
        "text",
        _minutes(8),
        "Un capítulo bien cargado puede darte tres salidas en una "
        "sentada:\n\n"
        "1. Guía de una página para quien no leyó.\n"
        "2. Cinco preguntas de menor a mayor dificultad, con respuesta "
        "breve al final.\n"
        "3. Un mensaje de 8 líneas para el grupo de familias.\n\n"
        "Pídelo así, o muy parecido:\n\n"
        "«Usa solo las fuentes de este cuaderno. No inventes datos que "
        "no estén. Si algo no está, di que no está. Pon al lado de "
        "cada bloque de dónde lo sacaste. Devuelve tres bloques con "
        "títulos: Guía | Preguntas | Familias.»\n\n"
        "Después itera una sola cosa a la vez: «Las preguntas 4 y 5 "
        "tienen que exigir relacionar dos ideas del texto, no copiar "
        "una frase.»\n\n"
        "Si una frase no abre el pasaje que cita, no es anclaje: es "
        "un adorno. Vuélvelo a pedir o escríbela tú.",
    ),
    (
        "Tres niveles sin hacer tres planificaciones",
        "text",
        _minutes(5),
        "Pedir «adapta esto» es vago. Pedir tres versiones con la "
        "misma evidencia es útil.\n\n"
        "«A partir de las mismas fuentes, arma tres versiones de la "
        "pregunta 3: una para quien aún no distingue la idea principal, "
        "una para el nivel de la clase, y una para quien ya puede "
        "argumentar. No cambies los hechos del texto. Formato: tabla "
        "nivel | pregunta | qué debe verse en una buena respuesta.»\n\n"
        "Eso no es «tres clases». Es un mismo objetivo, tres entradas. "
        "Tú eliges cuál proyectas y cuál dejas de refuerzo.\n\n"
        "Si el modelo inventa un hecho para el nivel alto, no es "
        "enriquecimiento: es otro texto. Vuélvelo a anclar: «solo lo "
        "que está en las fuentes.»",
    ),
]

EVAL_LESSONS_M1: list[Lesson] = [
    (
        "Excelente, bueno, regular no mide",
        "text",
        _minutes(6),
        "Una rúbrica de tres adjetivos mide el humor de quien corrige. "
        "Dos docentes, el mismo párrafo, dos notas. El estudiante "
        "aprende a adivinar al adulto.\n\n"
        "Si después le pides a un modelo «califica esto», copia esa "
        "vaguedad y la disfraza de 87/100. El número se ve serio. El "
        "criterio no existe.\n\n"
        "Una rúbrica que sirve nombra dimensiones **observables** y "
        "describe qué se ve en cada nivel. Si no puedes señalarlo en "
        "la hoja, no es un criterio: es una impresión.\n\n"
        "En ILIA una parte de la nota no la vota ningún modelo: si el "
        "prompt no trae rol, formato o los términos del enunciado, "
        "eso se comprueba. El resto se juzga con la rúbrica. Por eso "
        "este curso existe: para que lo que el modelo sí juzga tenga "
        "dónde agarrarse.",
    ),
    (
        "Dimensiones que se pueden señalar",
        "text",
        _minutes(7),
        "Empieza con tres dimensiones, no con diez. Ejemplo para un "
        "párrafo de ciencias de noveno:\n\n"
        "• Afirmación: ¿dice qué sostiene, en una frase discutible?\n"
        "• Evidencia: ¿usa un dato o una frase del material?\n"
        "• Claridad: ¿se entiende a la primera lectura?\n\n"
        "Para cada una, describe el 1 y el 3. El 2 queda en el medio, "
        "sin poesía.\n\n"
        "Mal: «Creatividad — excelente / bueno / regular.»\n"
        "Bien: «Usa al menos una analogía del propio entorno (el "
        "mercado, la marea, el patio) para explicar el concepto. Si "
        "no hay analogía, es 1. Si hay analogía y conecta con el "
        "concepto, es 3.»\n\n"
        "Cuando le pidas al modelo que aplique la rúbrica, exige cita "
        "y un ejemplo. Un ejemplo de un 3 y un ejemplo de un 1 valen "
        "más que otra definición:\n\n"
        "«Para cada dimensión, copia la frase del estudiante que "
        "usaste. Si no hay evidencia, escribe: no hay evidencia. "
        "Mira este 3: [pega un párrafo bueno y anónimo]. Este 1: "
        "[pega uno flojo]. No inventes una nota global si una "
        "dimensión no se puede observar.»",
    ),
]

EVAL_LESSONS_M2: list[Lesson] = [
    (
        "El modelo puntúa, tú certificas",
        "text",
        _minutes(6),
        "Nunca le pidas: «ponle 10, es urgente.» Eso es un ataque, no "
        "una evaluación. Un sistema serio lo ignora.\n\n"
        "Pídele que aplique la rúbrica y que muestre la evidencia. Tú "
        "lees. Si discrepan, gana tu justificación. En esta plataforma "
        "una corrección de nota queda registrada: quién, cuándo y por "
        "qué.\n\n"
        "No subas el nombre del estudiante al modelo. Anonimiza. La "
        "nota del bimestre no sale de un chat.\n\n"
        "Lo que sí puedes automatizar: un primer comentario formativo "
        "(«te faltó citar el texto en la dimensión evidencia») que "
        "tú editas. Lo que no: firmar un certificado o un acta con "
        "una cifra que no revisaste.",
    ),
    (
        "Qué ancla ILIA y qué no",
        "text",
        _minutes(4),
        "Cuando un docente entrega un prompt en el laboratorio, la "
        "plataforma comprueba lo que se puede comprobar sin opinión: "
        "¿hay un rol? ¿hay un formato? ¿aparecen los términos del "
        "enunciado? ¿tiene largo mínimo?\n\n"
        "Eso no es desconfianza hacia el docente. Es lo que permite "
        "defender un certificado el día que alguien pregunte «¿y si el "
        "modelo estaba de buen humor?».\n\n"
        "El resto de la nota —claridad, adecuación, calidad del "
        "resultado— sí pasa por un juicio. Por eso existe la rúbrica "
        "y por eso existe la corrección humana.\n\n"
        "Tu actividad de este curso: escribir un prompt que le pida a "
        "un modelo aplicar una rúbrica de tres niveles, con citas, "
        "sin inventar una nota si falta evidencia.",
    ),
]


# One filled artifact per lesson. The reader paints `:::ejemplo` as a card,
# not as another paragraph. Placeholders stay in the prose; these are the
# worked copies a teacher can steal for Monday.
LESSON_EXAMPLES: dict[str, list[tuple[str, str]]] = {
    "Un pedido de una línea": [
        (
            "El pedido de una línea",
            "Hazme una lectura de séptimo, bien creativa, con varias "
            "preguntas.",
        ),
        (
            "Esperamos: lo que devuelve",
            "1. Hierve el agua.\n"
            "2. Echa el arroz.\n"
            "3. Espera veinte minutos.\n\n"
            "Eso es una receta. El grado lo eligió el modelo, no Norma.",
        ),
        (
            "El pedido completo",
            "Eres docente de lengua de séptimo. Ya leyeron un cuento y "
            "saben qué es el narrador. Escribe un párrafo de ocho líneas "
            "con una sola idea, y cinco preguntas que se contestan con el "
            "texto, para que distingan la idea del párrafo y no inventen "
            "una historia. No inventes el autor. Devuélvelo: el párrafo y, "
            "debajo, las preguntas con la respuesta.",
        ),
        (
            "Esperamos: la hoja que sí se puede usar",
            "En el mercado de Tarqui el sábado se oye primero a quien "
            "vende pescado. Juana llega temprano, pregunta el precio y se "
            "lleva dos libras. Su hijo anota en un cuaderno qué compraron, "
            "no para una tarea: para que en casa sepan qué falta el lunes.\n\n"
            "| # | Pregunta | Se contesta con |\n"
            "| 1 | ¿Dónde está Juana? | En el mercado de Tarqui |\n"
            "| 2 | ¿Qué día? | El sábado |\n"
            "| 3 | ¿Qué se lleva? | Dos libras de pescado |\n"
            "| 4 | ¿Quién anota? | Su hijo |\n"
            "| 5 | ¿Para qué anota? | Para saber qué falta el lunes |",
        ),
    ],
    "Qué ocurre": [
        (
            "Un pedido que exige una fuente que nadie pegó",
            "Haz una lectura de séptimo según el Acuerdo Ministerial y pon "
            "el porcentaje de séptimos que ya comprenden un texto.",
        ),
        (
            "Esperamos: una cita que se tira",
            "«Según el Acuerdo Ministerial 2024-18, el 80 % de los séptimos "
            "ya distinguen el tema de las ideas.»\n"
            "Norma no pegó ese acuerdo. Ese 80 % no está en el informe. "
            "En Media, Lengua, 2024-25, es 682 / 61,9 % bajo 700. "
            "Esto no se fotocopia.",
        ),
    ],
    "Las cinco piezas": [
        (
            "El pedido al que le faltan las cinco",
            "Hazme una lectura de séptimo, bien creativa, con varias "
            "preguntas.",
        ),
        (
            "Esperamos: el modelo elige por ti",
            "Te puede salir una receta, un cuento de animalitos o un "
            "ensayo con tesis. El grado lo eligió el modelo, no tú.",
        ),
        (
            "El pedido con las cinco piezas",
            "Eres docente de lengua de séptimo en un colegio fiscal "
            "de la costa. Ya leyeron un cuento y saben qué es el narrador. "
            "Hay quienes todavía lo confunden con el protagonista.\n"
            "Escribe un párrafo de ocho líneas con una sola idea, y cinco "
            "preguntas que se contestan con el texto. La hora dura 45 "
            "minutos. No inventes el autor. No pidas una receta ni un "
            "ensayo.\n"
            "Devuélvelo: el párrafo y, debajo, las preguntas con la "
            "respuesta. No inventes un dato que yo no te di. Si hace "
            "falta el código de la destreza, va al final: LL.3.3.3.",
        ),
        (
            "Esperamos: la hoja de cinco preguntas",
            "En el mercado de Tarqui el sábado se oye primero a quien "
            "vende pescado. Juana llega temprano, pregunta el precio y se "
            "lleva dos libras. Su hijo anota en un cuaderno qué compraron, "
            "no para una tarea: para que en casa sepan qué falta el lunes.\n\n"
            "| # | Pregunta | Se contesta con |\n"
            "| 1 | ¿Dónde está Juana? | En el mercado de Tarqui |\n"
            "| 2 | ¿Qué día? | El sábado |\n"
            "| 3 | ¿Qué se lleva? | Dos libras |\n"
            "| 4 | ¿Quién anota? | Su hijo |\n"
            "| 5 | ¿Para qué anota? | Para saber qué falta el lunes |",
        ),
    ],
    "El recuadro": [
        (
            "El pedido con el texto en un recuadro",
            "Usa solo lo que está entre las líneas.\n"
            "---\n"
            "En el mercado de Tarqui el sábado se oye primero a quien "
            "vende pescado. Juana llega temprano y se lleva dos libras.\n"
            "---\n"
            "El tono y la longitud de las preguntas nuevas tienen que "
            "parecerse a estas. Si un dato no está ahí, escribe: no está "
            "en el texto.",
        ),
        (
            "Esperamos: dos preguntas al mismo tono",
            "| # | Pregunta | Se contesta con |\n"
            "| 1 | ¿A qué mercado llega Juana? | Al de Tarqui |\n"
            "| 2 | ¿Cuántas libras se lleva? | Dos |",
        ),
    ],
    "Adjuntar tus archivos": [
        (
            "El pedido con el capítulo adjunto",
            "Adjunto el capítulo 4 del texto de séptimo y mi planificación "
            "de la unidad.\n"
            "Usa solo esos archivos. Escribe un párrafo con una sola idea "
            "y cinco preguntas que se contestan con el texto.\n"
            "Al lado de cada pregunta pon la página de donde sale la "
            "respuesta. Si algo no está en los archivos, escribe: no está "
            "en el archivo. No inventes el autor.",
        ),
        (
            "Esperamos: cada respuesta con su página",
            "| # | Pregunta | Se contesta con | Página |\n"
            "| 1 | ¿Dónde está Juana? | En el mercado de Tarqui | p. 61 |\n"
            "| 2 | ¿Qué se lleva? | Dos libras | p. 61 |\n"
            "| 3 | ¿Para qué anota el hijo? | Para saber qué falta el lunes | p. 62 |\n"
            "| 4 | ¿Quién escribió el capítulo? | no está en el archivo | — |",
        ),
    ],
    "La hoja completa": [
        (
            "El pedido de la hoja completa",
            "Eres docente de lengua de séptimo. Ya leyeron un cuento y "
            "saben qué es el narrador. Arma una hoja: un párrafo con una "
            "idea y seis preguntas del texto, de más fácil a más difícil. "
            "La hora dura 45 minutos. Al final, las respuestas en otro "
            "bloque. No inventes el autor. No pidas una receta.",
        ),
        (
            "Esperamos: la guía lista para fotocopiar",
            "En el mercado de Tarqui el sábado se oye primero a quien "
            "vende pescado. Juana llega temprano, pregunta el precio y se "
            "lleva dos libras. Su hijo anota qué compraron para que en "
            "casa sepan qué falta el lunes.\n\n"
            "| # | Pregunta | Se contesta con |\n"
            "| 1 | ¿Qué día va Juana al mercado? | El sábado |\n"
            "| 2 | ¿A quién se oye primero? | A quien vende pescado |\n"
            "| 3 | ¿Qué pregunta Juana? | El precio |\n"
            "| 4 | ¿Qué se lleva? | Dos libras |\n"
            "| 5 | ¿Quién anota? | Su hijo |\n"
            "| 6 | ¿Para qué anota? | Para saber qué falta el lunes |",
        ),
    ],
    "Un resumen para alguien": [
        (
            "El pedido del mensaje a familias",
            "Escribe 8 líneas para el grupo de WhatsApp de las familias. "
            "Qué vimos hoy en séptimo (un párrafo y preguntas que se "
            "contestan con el texto) y una pregunta que pueden hacer en "
            "casa. Tono respetuoso, sin siglas.",
        ),
        (
            "Esperamos: la nota que pegas al grupo",
            "Hoy en séptimo leímos un párrafo corto y respondimos solo "
            "con lo que decía el texto. No era inventar una historia ni "
            "hacer un ensayo.\n"
            "En casa pueden preguntar: ¿qué fue lo único que hizo Juana "
            "en el mercado, según el párrafo?",
        ),
    ],
    "Cuarenta y cinco minutos": [
        (
            "El pedido de la hora por bloques",
            "Eres docente de lengua de séptimo. Diseña 45 minutos sobre "
            "un párrafo con una idea y preguntas que se contestan con el "
            "texto. Ya leyeron un cuento. Incluye: 8 minutos de apertura, "
            "20 de práctica guiada, 12 de trabajo individual, 5 de cierre. "
            "Di qué hace el docente y qué hace el estudiante. Tabla: "
            "tiempo | momento | qué hace quién. Los bloques deben sumar 45.",
        ),
        (
            "Esperamos: el plan de los 45 minutos",
            "| Tiempo | Momento | Qué hace quién |\n"
            "| 8 min | Apertura | El docente lee el párrafo en voz alta. "
            "Pregunta: ¿qué pasó, según el texto? No según ustedes. |\n"
            "| 20 min | Práctica | Juntos marcan la frase que responde "
            "la primera pregunta. El docente no acepta lo que no está "
            "escrito. |\n"
            "| 12 min | Individual | Cada quien responde las otras "
            "cuatro. El docente circula. |\n"
            "| 5 min | Cierre | Un estudiante dice la regla: si no está "
            "en el párrafo, no se inventa. Suma: 8+20+12+5 = 45. |",
        ),
    ],
    "El primer borrador no se fotocopia": [
        (
            "El pedido de una sola pasada",
            "Acorta las preguntas. Se leen en voz alta, no se copian del "
            "pizarrón. Una oración. No cambies el párrafo.",
        ),
        (
            "Esperamos: la pregunta que sí se puede dictar",
            "Antes: «Teniendo en cuenta los elementos narrativos del "
            "fragmento, determine el espacio en el que se desarrolla la "
            "acción.»\n"
            "Después: «¿Dónde está Juana, según el párrafo?»",
        ),
    ],
    "Antes de fotocopiar": [
        (
            "Primer resultado, sin revisar",
            "| # | Pregunta | Qué salió mal |\n"
            "| 1 | What is the main idea of the market? | Otro idioma |\n"
            "| 2 | Según García Márquez, ¿qué compra Juana? | Autor inventado |\n"
            "| 3 | Escribe un ensayo de tres páginas con tesis | Otro grado |",
        ),
        (
            "Esperamos: la hoja después de los cinco chequeos",
            "| # | Pregunta | Se contesta con |\n"
            "| 1 | ¿Dónde está Juana? | En el mercado de Tarqui |\n"
            "| 2 | ¿Qué se lleva? | Dos libras |\n"
            "| 3 | ¿Para qué anota el hijo? | Para saber qué falta el lunes |",
        ),
    ],
    "Por qué trabaja con tus fuentes": [
        (
            "Prompt al cuaderno",
            "Usa solo las fuentes de este cuaderno. Di cuál es la idea "
            "del párrafo y cita el pasaje. Si no está, di que no está.",
        ),
        (
            "Esperamos: una cita que tienes que abrir",
            "El modelo dice: «El párrafo nombra a García Márquez (cita 3).»\n"
            "Abres la cita 3: Juana llega a Tarqui. No hay autor. "
            "No es anclaje. Se tira o se vuelve a pedir.",
        ),
    ],
    "Qué cargar y qué no": [
        (
            "Lo que entra al cuaderno",
            "| Cargo | No cargo |\n"
            "| Capítulo 4 del texto, PDF | Lista de nombres y notas |\n"
            "| Tus apuntes de la unidad | Foto de un menor |\n"
            "| La rúbrica de la tarea | Chat del grupo de familias |\n"
            "| Tres párrafos anónimos de ensayo | Cédula o diagnóstico |",
        ),
    ],
    "Una clase completa desde tu capítulo": [
        (
            "Prompt de las tres salidas",
            "Usa solo las fuentes de este cuaderno. No inventes datos que "
            "no estén. Si algo no está, di que no está. Devuelve tres "
            "bloques: Guía | Preguntas | Familias.",
        ),
        (
            "Esperamos: guía, preguntas y nota",
            "| Bloque | Qué sale |\n"
            "| Guía | La idea del párrafo no es «el mercado». Es que Juana compra y el hijo anota para el lunes. |\n"
            "| Preguntas | 1) ¿Dónde está Juana? 2) ¿Qué se lleva? 3) ¿Para qué anota el hijo? |\n"
            "| Familias | Hoy leímos un párrafo corto y respondimos solo con lo que decía el texto. Pregunten: ¿qué hizo Juana, según el párrafo? |",
        ),
    ],
    "Tres niveles sin hacer tres planificaciones": [
        (
            "Prompt de tres entradas",
            "A partir de las mismas fuentes, arma tres versiones de la "
            "pregunta 3: una para quien aún no distingue, una para el nivel "
            "de la clase, y una para quien ya argumenta. No cambies los "
            "hechos. Formato: tabla nivel | pregunta | qué debe verse.",
        ),
        (
            "Esperamos: la pregunta 3, tres veces",
            "| Nivel | Pregunta | Qué debe verse |\n"
            "| Aún no distingue | ¿Dónde está Juana? Una frase del texto. | "
            "Copia «mercado de Tarqui». |\n"
            "| Nivel de la clase | ¿Qué se lleva y para qué anota el hijo? | "
            "Dos libras; para saber qué falta el lunes. |\n"
            "| Ya argumenta | ¿Por qué el hijo anota, si no es una tarea? | "
            "Señala «para que en casa sepan qué falta el lunes». |",
        ),
    ],
    "Excelente, bueno, regular no mide": [
        (
            "Prompt con rúbrica hueca",
            "Califica este párrafo: «Juana va al mercado porque es sábado.» "
            "Usa excelente, bueno o regular y pon un número sobre 100.",
        ),
        (
            "Esperamos: dos notas que no se pueden defender",
            "Docente A: 87/100, «bueno».\n"
            "Docente B: regular.\n"
            "El modelo, con esa rúbrica, inventa otro número igual de hueco. "
            "No se puede señalar en la hoja qué midieron.",
        ),
    ],
    "Dimensiones que se pueden señalar": [
        (
            "Prompt que aplica la rúbrica",
            "Aplica esta rúbrica al párrafo anónimo. Para cada dimensión, "
            "copia la frase que usaste o escribe: no hay evidencia. Mira "
            "este 3 y este 1. No inventes una nota global si falta evidencia.\n"
            "Dimensiones: afirmación, evidencia, claridad.",
        ),
        (
            "Esperamos: la rúbrica llena, no un 87",
            "| Dimensión | Nivel | Evidencia en la hoja |\n"
            "| Afirmación | 2 | «la marea sube porque la luna tira» — hay "
            "tesis, le falta el «por qué» del texto. |\n"
            "| Evidencia | 1 | no hay evidencia |\n"
            "| Claridad | 3 | Se entiende a la primera lectura. |",
        ),
    ],
    "El modelo puntúa, tú certificas": [
        (
            "Prompt de comentario formativo",
            "Aplica la rúbrica. Para evidencia, cita la frase o escribe: "
            "no hay evidencia. No pongas una nota de bimestre.",
        ),
        (
            "Esperamos: comentario del modelo, firma tuya",
            "El modelo: «Evidencia: 1. No hay frase del texto.»\n"
            "Tú dejas el 1 y editas: «Te faltó citar el párrafo de la "
            "página 12.»\n"
            "La nota del bimestre la firmas tú. El chat no entra al acta.",
        ),
    ],
    "Qué ancla ILIA y qué no": [
        (
            "Qué comprueba la plataforma",
            "| Se ancla (sin opinión) | No se ancla (lo juzgas tú) |\n"
            "| ¿Hay un rol en el prompt? | ¿El tono le sirve a tu 7.º? |\n"
            "| ¿Hay un formato pedido? | ¿La analogía del mercado es buena? |\n"
            "| ¿Aparece el tema del enunciado? | ¿Vale un 2 o un 3 en claridad? |\n"
            "| ¿Llega al largo mínimo? | ¿Fotocopias este borrador el lunes? |",
        ),
    ],
}


def _attach_examples(lessons: list[Lesson]) -> list[Lesson]:
    attached: list[Lesson] = []
    for title, kind, duration, body in lessons:
        examples = LESSON_EXAMPLES.get(title)
        if not examples:
            raise ValueError(f"Missing worked example for lesson: {title}")
        fences = "\n\n".join(
            f":::ejemplo {example_title}\n{example_body.strip()}\n:::"
            for example_title, example_body in examples
        )
        attached.append((title, kind, duration, f"{body}\n\n{fences}"))
    return attached


PROMPTING_LESSONS_M1 = _attach_examples(PROMPTING_LESSONS_M1)
PROMPTING_LESSONS_M2 = _attach_examples(PROMPTING_LESSONS_M2)
PROMPTING_LESSONS_M3 = _attach_examples(PROMPTING_LESSONS_M3)
NOTEBOOK_LESSONS_M1 = _attach_examples(NOTEBOOK_LESSONS_M1)
NOTEBOOK_LESSONS_M2 = _attach_examples(NOTEBOOK_LESSONS_M2)
EVAL_LESSONS_M1 = _attach_examples(EVAL_LESSONS_M1)
EVAL_LESSONS_M2 = _attach_examples(EVAL_LESSONS_M2)


TEACHER_COURSES: list[dict[str, Any]] = [
    {
        "slug": "prompting-para-docentes",
        "title": "Prompting para docentes",
        "summary": "Por qué un pedido vago no sirve y cómo se escribe uno que sí",
        "description": (
            "Primero ves qué ocurre cuando el pedido es vago: el modelo "
            "rellena lo que no le dijiste. Después armas las cinco piezas "
            "de un pedido que sí devuelve material de tu grado. El caso "
            "que se sigue es el de una docente de lengua de séptimo. "
            "Cierras escribiendo el pedido de TU clase."
        ),
        "level": "beginner",
        "modules": [
            ("Qué ocurre y cómo se pide", PROMPTING_LESSONS_M1),
            ("Material que cabe en la hora", PROMPTING_LESSONS_M2),
            ("Antes de llevarlo al aula", PROMPTING_LESSONS_M3),
        ],
    },
    {
        "slug": "notebooklm-en-el-aula",
        "title": "NotebookLM en el aula",
        "summary": "Guía, preguntas y nota a familias desde tu propio capítulo",
        "description": (
            "NotebookLM trabaja con las fuentes que tú le das. Armas una "
            "clase a partir de tu capítulo —sin que el modelo mezcle otro "
            "libro— y aprendes qué no se carga nunca: nombres, notas, "
            "fotos de estudiantes."
        ),
        "level": "intermediate",
        "modules": [
            ("Fuentes, no internet", NOTEBOOK_LESSONS_M1),
            ("Una clase desde tu material", NOTEBOOK_LESSONS_M2),
        ],
    },
    {
        "slug": "evaluacion-asistida-por-ia",
        "title": "Evaluación asistida por IA",
        "summary": "Rúbricas que se pueden señalar en la hoja",
        "description": (
            "Diseñas dimensiones observables y usas el modelo como primer "
            "lector, no como quien firma el acta. Una parte de la nota en "
            "esta plataforma ni siquiera la vota un modelo: se ancla."
        ),
        "level": "expert",
        "modules": [
            ("Rúbricas que miden", EVAL_LESSONS_M1),
            ("Quién certifica", EVAL_LESSONS_M2),
        ],
    },
]


TEACHER_ACTIVITIES: list[dict[str, Any]] = [
    {
        "course_slug": "prompting-para-docentes",
        "title": "El pedido de tu próxima clase",
        "statement": (
            "Escribe el pedido para el material de TU próxima clase, "
            "como hizo Norma el domingo. Si aún no tienes el tema, usa "
            "el de ella: 7.º EGB, un párrafo con una idea y cinco "
            "preguntas que se contestan con el texto. No pidas una "
            "receta ni un ensayo.\n\n"
            "Tiene que: decirle quién es el modelo, para quién es "
            "(el grado), qué ya vieron, cuántas preguntas, y cómo lo "
            "quieres de vuelta. Si puedes, pega un ejemplo corto de "
            "cómo se ve una pregunta.\n\n"
            "Di qué tienen que saber hacer, no solo «una lectura». "
            "El código, si lo pegas al final, es LL.3.3.3."
        ),
        "checks": {
            "requires_role": True,
            "requires_format": True,
            "required_terms": [["grado", "séptimo", "septimo", "noveno", "año"]],
            "min_length": 20,
        },
    },
    {
        "course_slug": "notebooklm-en-el-aula",
        "title": "Encargo anclado a tus fuentes",
        "statement": (
            "Escribe el prompt que le darías a NotebookLM (o a un modelo "
            "con documentos cargados) para armar una clase a partir de UN "
            "capítulo.\n\n"
            "Tiene que: pedirle que use solo las fuentes, que no invente "
            "si algo no está, y devolver tres bloques: guía para el "
            "estudiante, preguntas de repaso y un texto corto para "
            "familias. Di el formato de cada bloque."
        ),
        "checks": {
            "requires_role": True,
            "requires_format": True,
            "required_terms": [["fuentes", "fuente", "documentos"], ["familias", "familia"]],
            "min_length": 20,
        },
    },
    {
        "course_slug": "evaluacion-asistida-por-ia",
        "title": "Rúbrica que el modelo no puede votar a ciegas",
        "statement": (
            "Escribe un prompt que le pida a un modelo aplicar una rúbrica "
            "de tres niveles (1, 2 y 3) a un párrafo de estudiante.\n\n"
            "La rúbrica tiene que tener al menos dos dimensiones "
            "observables (no «excelente / bueno / regular»). El prompt "
            "debe exigir que, para cada dimensión, cite una frase del "
            "texto o declare que no hay evidencia. Prohibido inventar una "
            "nota global si falta evidencia. Indica el formato de la "
            "salida (tabla o lista)."
        ),
        "checks": {
            "requires_role": True,
            "requires_format": True,
            "required_terms": [["rúbrica", "rubrica"], ["evidencia"]],
            "min_length": 25,
        },
    },
]
