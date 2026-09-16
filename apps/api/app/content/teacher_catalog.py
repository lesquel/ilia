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
        "Esta semana te ahorras una tarde",
        "text",
        _minutes(4),
        "Esto no va de inteligencia artificial. Va de pedirle a un modelo "
        "una hoja que sí puedas usar en la próxima hora. Él escribe el "
        "borrador. Tú decides qué se fotocopia.\n\n"
        "Piensa en el tema de mañana. Si no tienes uno, usa séptimo: "
        "un párrafo con una idea y cinco preguntas que se contestan con "
        "el texto. Eso no es una receta ni un ensayo con tesis: una "
        "receta es de segundo; el ensayo, de tercero de bachillerato.\n\n"
        "El truco es el mismo en matemática, sociales o ciencias. Dile el "
        "grado y qué tienen que saber hacer. «Lectura» sola no basta: "
        "el modelo elige el grado que le da la gana.",
    ),
    (
        "Qué puede y qué no puede un modelo",
        "text",
        _minutes(5),
        "El modelo no estuvo en tu aula. Predice texto que suena bien, "
        "nada más. No sabe quién faltó, ni qué ya vieron, ni si en tu "
        "libro dicen «narrador» o «el que cuenta».\n\n"
        "Por eso sirve para:\n"
        "• Borradores de guías, ejemplos y preguntas.\n"
        "• Reformular al nivel de tus estudiantes.\n"
        "• Proponer un formato (tabla, lista, carta a familias).\n\n"
        "Y no sirve, solo, para:\n"
        "• Certificar que un estudiante aprendió.\n"
        "• Inventar datos de un capítulo que no le diste.\n"
        "• Decidir la nota del bimestre.\n\n"
        "Si el resultado no se parece a tu curso, casi nunca es «la IA no "
        "sirve». Es que el prompt no tenía tu curso.\n\n"
        "Tampoco sirve para inventar una fuente ni un porcentaje. Si "
        "dice «según el Ministerio» y tú no pegaste el decreto, esa "
        "cita es teatro. Si te suelta que el 80 % de séptimo ya domina "
        "el tema, es mentira: en la prueba nacional la mayoría de Media "
        "en lengua no llega al mínimo. No inventes un número.\n\n"
        "Regla práctica: nada de lo que genere el modelo se imprime sin "
        "que tú lo leas. Un error de un modelo en una guía de séptimo se "
        "vuelve error de veinte cuadernos.",
    ),
    (
        "Anatomía de un prompt que sirve",
        "text",
        _minutes(7),
        "OpenAI, Google y el ministerio inglés dicen lo mismo, cada uno "
        "con su nombre: di la tarea, el aula y cómo lo quieres de vuelta. "
        "Si falta una pieza, el modelo la rellena con un promedio de "
        "internet.\n\n"
        "1. Quién es. «Eres docente de lengua de séptimo en un colegio "
        "público.»\n"
        "2. Para quién. El muchacho no es la familia ni el suplente. "
        "«Se lee en voz alta. Hay quienes todavía confunden el "
        "narrador con el protagonista.»\n"
        "3. Qué ya vieron. Y qué no debe salir. «Ya leyeron un cuento. "
        "La hora dura 45 minutos. No pidas una receta. No pidas un "
        "ensayo con tesis.»\n"
        "4. Qué tienen que saber hacer. El nombre del tema no basta. "
        "«Lectura» lo entiende un modelo como una receta o como un "
        "ensayo de tercero de bachillerato. En séptimo es: un párrafo "
        "con una idea y cinco preguntas que se contestan con el texto.\n"
        "5. Cuántos y cómo. «El párrafo y, debajo, las cinco preguntas "
        "con la respuesta.»\n\n"
        "Si en tu planificación aparece un código raro del ministerio "
        "(algo como LL.3.3.3), pégalo al final. Es solo una etiqueta "
        "para que el modelo no se invente el grado. Si no lo tienes, "
        "no pasa nada: di la tarea en cristiano.\n\n"
        "Si pides solo esto: «Hazme una lectura.»\n\n"
        "Si le dices el aula: «Eres docente de lengua de séptimo en un "
        "colegio público de la costa. Ya leyeron un cuento y saben qué "
        "es el narrador. Escribe un párrafo de ocho líneas con una sola "
        "idea, y cinco preguntas que se contestan con el texto. No "
        "inventes el autor. No pidas una receta ni un ensayo. "
        "Devuélvelo: el párrafo y, debajo, las preguntas con la "
        "respuesta.»\n\n"
        "El segundo no es más largo por adorno. Cada dato le quita al "
        "modelo una decisión. Lo mismo vale en matemática («un cuarto "
        "más un medio, no contar trozos») o en sociales («de 1809 "
        "hasta Alfaro, solo el período que marca el texto»).",
    ),
    (
        "Un ejemplo y un recuadro",
        "text",
        _minutes(6),
        "Una instrucción más no siempre ayuda. Un ejemplo sí. En "
        "inglés lo llaman few-shot: le muestras cómo se ve un buen "
        "resultado, no solo se lo describes.\n\n"
        "Pega un ejercicio que tú ya usarías y di: «El tono y la "
        "longitud de los nuevos tienen que parecerse a este.» Dos "
        "ejemplos bastan. Cinco empiezan a copiar un patrón que no "
        "querías.\n\n"
        "Cuando pegas un capítulo o un escrito de estudiante, márcalo. "
        "Si no, el modelo mezcla tu pedido con el texto y no sabe dónde "
        "termina cada uno. Sirve así:\n\n"
        "«Usa solo lo que está entre las líneas.\n"
        "---\n"
        "(aquí el párrafo o el capítulo)\n"
        "---\n"
        "Si algo no está ahí, escribe: no está en el texto.»\n\n"
        "Eso es lo que en las guías técnicas aparece como delimitador "
        "o etiqueta. En el aula es más simple: un recuadro. Sin recuadro, "
        "un nombre o una nota que iban en el texto se vuelven parte de "
        "la consigna.\n\n"
        "Regla práctica: no pegas un expediente. Pegas contenido. El "
        "nombre del estudiante no entra en el recuadro.",
    ),
]

PROMPTING_LESSONS_M2: list[Lesson] = [
    (
        "Guía de ejercicios de tu temario",
        "text",
        _minutes(8),
        "Pedir «hazme una guía» produce una guía de catálogo: sin tiempo, "
        "sin nivel, sin lo que ya vieron tus estudiantes.\n\n"
        "Parte del temario que ya tienes. El prompt tiene que decir:\n"
        "• el curso y el grado;\n"
        "• qué ya vieron y qué no;\n"
        "• cuántos ítems y cómo se reparte la dificultad;\n"
        "• si la clave de respuestas va al final (para proyectar sin "
        "spoilear) o en otro bloque.\n\n"
        "Ejemplo que puedes adaptar:\n\n"
        "«Eres docente de [materia] de [grado]. Ya vieron [tema previo]. "
        "Arma 8 ejercicios sobre [tema de mañana]: 2 de entrada, 4 de "
        "práctica, 2 desafiantes, y una pregunta de cierre que se responde "
        "en una frase. La hora dura 45 minutos. Formato: lista numerada. "
        "Al final, una sección aparte con las respuestas.»\n\n"
        "Si el primer resultado es verboso, itera: «Acorta los enunciados. "
        "Se leen en voz alta, no se copian del pizarrón.»",
    ),
    (
        "Resumen para quien no vino o no leyó",
        "text",
        _minutes(5),
        "«Resúmeme esto» devuelve un resumen genérico. Un docente necesita "
        "un resumen **para alguien**: el estudiante que faltó, el que no "
        "leyó el capítulo, o la familia que pregunta qué vieron.\n\n"
        "Pide siempre para quién y para qué.\n\n"
        "Para el estudiante:\n"
        "«Resume este texto en 5 viñetas para alumnos de 14 años que no "
        "vieron el tema. En cada viñeta, una idea y una pregunta de "
        "comprensión. No uses jerga que el texto no explique.»\n\n"
        "Para las familias:\n"
        "«Escribe 8 líneas para el grupo de WhatsApp de las familias. "
        "Qué vimos hoy y una pregunta que pueden hacer en casa. Tono "
        "respetuoso, sin siglas.» "
        "Ese mensaje lo escribes tú, para las familias. No es un deber "
        "del estudiante.\n\n"
        "Si pegas un texto largo, di también qué debe ignorar (ejemplos "
        "de otro país, precios en otra moneda, nombres propios que no "
        "son del currículo).",
    ),
    (
        "Una hora de 45 minutos, no un temario infinito",
        "text",
        _minutes(5),
        "El modelo no siente el reloj. Si no le dices que la hora dura "
        "45 minutos, te arma una secuencia de dos horas.\n\n"
        "Pide una planificación con bloques:\n"
        "«Eres docente de [materia] de [grado]. Diseña 45 minutos sobre "
        "[tema]. Ya vieron [X]. Incluye: 8 minutos de apertura, 20 de "
        "práctica guiada, 12 de trabajo individual, 5 de cierre. Di qué "
        "hace el docente y qué hace el estudiante en cada bloque. Formato: "
        "tabla tiempo | momento | qué hace quién.»\n\n"
        "Revisa que los minutos sumen 45. Si no suman, el prompt no era "
        "explícito o el modelo improvisó: corrige en una segunda pasada "
        "(«los bloques deben sumar exactamente 45»).\n\n"
        "Eso es más valioso que una «clase perfecta» de diez páginas que "
        "nadie puede dar el lunes.",
    ),
    (
        "El primer borrador no se fotocopia",
        "text",
        _minutes(5),
        "El primer resultado es un borrador. Las guías actuales para "
        "docentes (OpenAI, 2026; DfE Reino Unido, 2026) lo dicen sin "
        "rodeos: no empieces de cero si ya está cerca. Pide un cambio.\n\n"
        "Una cosa por pasada:\n"
        "• «Acorta los enunciados. Se leen en voz alta.»\n"
        "• «Tres más fáciles y tres más difíciles, mismo tema.»\n"
        "• «Quita los ejemplos de otro país.»\n"
        "• «Reescribe las instrucciones para que un estudiante las lea "
        "solo.»\n\n"
        "Si pides todo a la vez, el modelo arregla una cosa y rompe "
        "otra. Si el paquete es grande —guía, ticket de salida, nota a "
        "familias— parte el trabajo: primero el objetivo y los bloques "
        "de 45 minutos; después la hoja del estudiante.\n\n"
        "También puedes pedirle que mejore TU prompt, no el material:\n\n"
        "«Reescribe este pedido para que tenga tarea, aula y formato. "
        "No inventes un grado que yo no puse.»\n\n"
        "Luego lo lees. Si metió un estándar de otro país o un tiempo "
        "que no es el tuyo, lo sacas. El modelo sugiere. Tú firmas.\n\n"
        "Regla práctica: si no puedes decir qué cambió en esta pasada, "
        "todavía no iteraste: solo volviste a pedir «hazlo mejor».",
    ),
]

PROMPTING_LESSONS_M3: list[Lesson] = [
    (
        "Revisa antes de fotocopiar",
        "text",
        _minutes(4),
        "En Inglaterra el marco FACTS (2026) lo resume así: enfoca el "
        "pedido, analiza el resultado, busca sesgo, ajústalo a TU aula "
        "y fortalece el prompt. Aquí son cinco chequeos, siempre:\n\n"
        "1. ¿Aparece un dato que tú no diste? Un autor, una fecha, un "
        "ejemplo de otro país. Si no lo puedes señalar en tu material, "
        "sácalo.\n"
        "2. ¿Hay una cita o un «según el Ministerio» que no pegaste? "
        "Los modelos inventan fuentes que suenan serias. Sin el PDF, "
        "esa referencia no existe.\n"
        "3. ¿El nivel es el de tu grado? Una «lectura de séptimo» que "
        "pide un ensayo con tesis no sirve. Tampoco una receta, ni un "
        "cuento de animalitos, como si fuera lo mismo que un párrafo "
        "con preguntas del texto.\n"
        "4. ¿El ejemplo asume otra vida? Precios en dólares, nieve, un "
        "barrio que tus estudiantes no conocen. Eso no es inclusión: "
        "es un aula de catálogo.\n"
        "5. ¿Hay algo que un estudiante podría copiar como si fuera "
        "verdad y está mal? Un error en la clave de respuestas es el "
        "más caro.\n\n"
        "Si el modelo se niega a poner la clave o la pone mal, no "
        "insistas diez veces. Escribe tú la clave. El ahorro de tiempo "
        "está en el borrador, no en delegar la verdad.\n\n"
        "Siguiente paso: el laboratorio. Vas a escribir el prompt de "
        "tu próxima clase: quién es el modelo, para quién, qué ya "
        "vieron y cómo lo quieres de vuelta. Eso es la evidencia del "
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
    "Esta semana te ahorras una tarde": [
        (
            "El pedido de esta semana",
            "Eres docente de lengua de séptimo. Ya leyeron un cuento y "
            "saben qué es el narrador. Escribe un párrafo de ocho líneas "
            "con una sola idea, y cinco preguntas que se contestan con el "
            "texto. No inventes el autor. No pidas una receta. Devuélvelo: "
            "el párrafo y, debajo, las preguntas con la respuesta.",
        ),
        (
            "Esperamos: la hoja que te llevas el lunes",
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
    "Qué puede y qué no puede un modelo": [
        (
            "Un pedido que pide una fuente que no pegaste",
            "Haz una lectura de séptimo según el Acuerdo Ministerial y pon "
            "el porcentaje de séptimos que ya comprenden un texto.",
        ),
        (
            "Esperamos: una cita que se tira",
            "«Según el Acuerdo Ministerial 2024-18, el 80 % de los séptimos "
            "ya distinguen el tema de las ideas.»\n"
            "Tú no pegaste ese acuerdo. Ese 80 % no está en ninguna "
            "prueba. En la evaluación nacional la mayoría de Media en "
            "lengua no llega al mínimo. Esto no se fotocopia.",
        ),
    ],
    "Anatomía de un prompt que sirve": [
        (
            "Si pides solo esto",
            "Hazme una lectura.",
        ),
        (
            "Esperamos: una hoja de nadie",
            "Te puede salir una receta, un cuento de animalitos o un "
            "ensayo con tesis. El modelo eligió el grado. Tú no.",
        ),
        (
            "Si le dices el aula",
            "Eres docente de lengua de séptimo en un colegio público "
            "de la costa. Ya leyeron un cuento y saben qué es el narrador. "
            "Hay quienes todavía lo confunden con el protagonista.\n"
            "Escribe un párrafo de ocho líneas con una sola idea, y cinco "
            "preguntas que se contestan con el texto. La hora dura 45 "
            "minutos. No inventes el autor. No pidas una receta ni un "
            "ensayo.\n"
            "Devuélvelo: el párrafo y, debajo, las preguntas con la "
            "respuesta. No inventes un dato que yo no te di.",
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
    "Un ejemplo y un recuadro": [
        (
            "Pedido con recuadro",
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
    "Guía de ejercicios de tu temario": [
        (
            "Pedido de la guía",
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
    "Resumen para quien no vino o no leyó": [
        (
            "Pedido para el grupo de familias",
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
    "Una hora de 45 minutos, no un temario infinito": [
        (
            "Pedido de la hora",
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
            "Pedido de una pasada",
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
    "Revisa antes de fotocopiar": [
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
        "summary": "El prompt de tu próxima clase, no un examen de teoría",
        "description": (
            "Aprendes a pedirle a un modelo material que sí puedes llevar al "
            "aula: quién es el modelo, para quién, qué ya vieron y cómo "
            "lo quieres de vuelta. Cierras escribiendo el prompt de tu "
            "propia clase. El modelo redacta; tú decides qué se fotocopia."
        ),
        "level": "beginner",
        "modules": [
            ("El oficio, no la herramienta", PROMPTING_LESSONS_M1),
            ("Material que cabe en 45 minutos", PROMPTING_LESSONS_M2),
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
        "title": "El prompt de tu próxima clase",
        "statement": (
            "Escribe el pedido para el material de TU próxima clase. "
            "Si aún no tienes el tema, usa séptimo: un párrafo con una "
            "idea y cinco preguntas que se contestan con el texto. No "
            "pidas una receta ni un ensayo.\n\n"
            "Tiene que: decirle quién es el modelo, para quién es "
            "(el grado), qué ya vieron, cuántas preguntas, y cómo lo "
            "quieres de vuelta. Si puedes, pega un ejemplo corto de "
            "cómo se ve una pregunta.\n\n"
            "Di qué tienen que saber hacer, no solo «una lectura»."
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
