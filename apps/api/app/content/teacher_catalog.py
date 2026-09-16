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
        "una hoja que sí puedas usar en la próxima hora.\n\n"
        "Si llegas de la jornada y te quedan dos horas de planear, el "
        "modelo te arma un borrador. Tú decides qué se fotocopia. Esa es "
        "la regla de todo el curso: él escribe, tú respondes por el aula.\n\n"
        "Hoy vas a ver por qué un pedido corto sale genérico, cómo se pide "
        "con rol, aula, tarea y formato, y cómo se mejora el primer "
        "borrador. Al final escribes el prompt de tu clase. No hay examen. "
        "La evidencia es ese prompt.\n\n"
        "Piensa en el tema de mañana. Si no tienes uno, usa séptimo: "
        "sumar fracciones que no tienen el mismo número abajo. Un cuarto "
        "más un medio. Eso no es contar cuántos trozos tiene un pastel: "
        "eso se pide en segundo o tercero.\n\n"
        "El truco es el mismo en lengua, sociales o ciencias. Dile el "
        "grado y qué tienen que saber hacer. «Fracciones» solo no basta: "
        "el modelo elige el grado que le da la gana.",
    ),
    (
        "Qué puede y qué no puede un modelo",
        "text",
        _minutes(5),
        "El modelo no estuvo en tu aula. Predice texto que suena bien, "
        "nada más. No sabe quién faltó, ni qué ya vieron, ni si en tu "
        "libro dicen «quebrados» o «fracciones».\n\n"
        "Por eso sirve para:\n"
        "• Borradores de guías, ejemplos y preguntas.\n"
        "• Reformular al nivel de tus estudiantes.\n"
        "• Proponer un formato (tabla, lista, carta a familias).\n\n"
        "Y no sirve, solo, para:\n"
        "• Certificar que un estudiante aprendió.\n"
        "• Inventar datos de un capítulo que no le diste.\n"
        "• Decidir la nota del bimestre.\n\n"
        "Si el resultado no se parece a tu curso, casi nunca es «la IA no "
        "sirve». Es que el prompt no tenía tu curso. La siguiente lección "
        "enseña las piezas del pedido que evitan eso.\n\n"
        "Tampoco sirve para inventar una fuente ni un porcentaje. Si "
        "dice «según el Ministerio» y tú no pegaste el decreto, esa "
        "cita es teatro. Si te suelta que el 80 % de séptimo ya domina "
        "el tema, es mentira: en la prueba nacional la mayoría de Media "
        "en matemática no llega al mínimo. No inventes un número.\n\n"
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
        "1. ROL. Quién es el modelo. «Eres docente de matemática de "
        "séptimo en un colegio público.»\n"
        "2. PARA QUIÉN. El muchacho no es la familia ni el suplente. "
        "«Los enunciados se leen en voz alta. Hay quienes aún mezclan "
        "equivalente y simplificar.»\n"
        "3. QUÉ YA VIERON. Y qué no debe salir. «Ya vimos que 1/2 y 2/4 "
        "son lo mismo. La hora es de 45 minutos. No uses euros. No "
        "pidas contar trozos de un pastel.»\n"
        "4. QUÉ TIENEN QUE SABER HACER. El nombre del tema no basta. "
        "«Fracciones» lo entiende un modelo como contar trozos, y eso "
        "es de segundo. En séptimo es: un cuarto más un medio, y antes "
        "igualar el número de abajo. En lengua, una receta no es un "
        "ensayo de tercero de bachillerato.\n"
        "5. CUÁNTOS Y CÓMO. «5 ejercicios, de más fácil a más difícil. "
        "Tabla: consigna | respuesta.»\n\n"
        "Si en tu planificación aparece un código raro del ministerio "
        "(algo como M.3.1.39), pégalo al final. Es solo una etiqueta "
        "para que el modelo no se invente el grado. Si no lo tienes, "
        "no pasa nada: di la tarea en cristiano.\n\n"
        "Compáralo.\n\n"
        "Flojo: «Haz un ejercicio de fracciones.»\n\n"
        "Útil: «Eres docente de matemática de séptimo en un colegio "
        "público de la costa. Ya vieron que 1/2 y 2/4 son lo mismo. "
        "Arma 5 ejercicios de suma con distinto denominador, de menor a "
        "mayor dificultad. Devuélvelo en una tabla: consigna | "
        "respuesta esperada. No inventes un dato que yo no te di. No "
        "pidas contar trozos.»\n\n"
        "El segundo no es más largo por adorno. Cada dato le quita al "
        "modelo una decisión. Lo mismo vale en lengua («un párrafo de 8 "
        "líneas para tercero de bachillerato, con tesis, tono formal») "
        "o en sociales («línea de tiempo de 1809 hasta Alfaro, solo el "
        "período que marca el texto»).",
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
        "3. ¿El nivel es el de tu grado? Un ejercicio de «séptimo» que "
        "pide álgebra de bachillerato no sirve. Tampoco uno que pide "
        "contar trozos de un pastel, ni pintar un porcentaje en un "
        "círculo como si fuera lo mismo que sumar un cuarto y un medio.\n"
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
            "Prompt de esta semana",
            "Eres docente de matemática de séptimo. Ya vieron que 1/2 y "
            "2/4 son lo mismo. Arma una hoja de 5 sumas con distinto "
            "denominador, de menor a mayor dificultad. Formato: consigna "
            "y respuesta. Sin euros. No pidas contar trozos de un pastel.",
        ),
        (
            "Esperamos: la hoja que te llevas el lunes",
            "| # | Consigna | Respuesta |\n"
            "| 1 | Un quintal se parte en 4. ¿Cuánto es 1/4 + 1/2? | 3/4 |\n"
            "| 2 | Ana camina 2/3 de la cuadra y luego 1/6. ¿Cuánto recorrió? | 5/6 |\n"
            "| 3 | Suma 1/3 + 1/6. Di el denominador común en voz alta. | 1/2 |\n"
            "| 4 | ¿Por qué 1/2 + 1/4 no es 2/6? | Primero se iguala el denominador |\n"
            "| 5 | Dibuja 3/4 de naranja y 1/2 de otra. ¿Cuál es más? | 3/4 |",
        ),
    ],
    "Qué puede y qué no puede un modelo": [
        (
            "Prompt que pide una fuente que no pegaste",
            "Haz una guía de fracciones según el Acuerdo Ministerial y pon "
            "el porcentaje de séptimos que ya dominan el tema.",
        ),
        (
            "Esperamos: una cita que se tira",
            "«Según el Acuerdo Ministerial 2024-18, el 80% de los séptimos "
            "ya dominan equivalentes.»\n"
            "Tú no pegaste ese acuerdo. Ese 80 % no está en ninguna "
            "prueba. En la evaluación nacional la mayoría de Media en "
            "matemática no llega al mínimo. Esto no se fotocopia.",
        ),
    ],
    "Anatomía de un prompt que sirve": [
        (
            "Prompt flojo",
            "Haz un ejercicio de fracciones.",
        ),
        (
            "Esperamos: un ítem de catálogo",
            "| # | Consigna | Respuesta |\n"
            "| 1 | Calcula 2/5 + 3/7. | El modelo a veces pone euros, o no "
            "pone clave, o asume otro grado. |",
        ),
        (
            "Prompt que sí",
            "Eres docente de matemática de séptimo en un colegio público "
            "de la costa. Los estudiantes ya vieron que 1/2 y 2/4 son lo "
            "mismo. Hay quienes aún mezclan equivalente y simplificar.\n"
            "Arma 5 ejercicios de suma con distinto denominador, de menor a "
            "mayor dificultad. La hora dura 45 minutos. No uses euros ni nieve. "
            "No pidas contar trozos de un pastel.\n"
            "Devuélvelo en una tabla: consigna | respuesta esperada. No inventes "
            "un dato que yo no te di.",
        ),
        (
            "Esperamos: hoja de 5 ejercicios",
            "| # | Consigna | Respuesta |\n"
            "| 1 | En el mercado, un quintal se parte en 4. ¿Cuánto es 1/4 + 1/2? | 3/4 |\n"
            "| 2 | Ana camina 2/3 de la cuadra y luego 1/6. ¿Cuánto recorrió? | 5/6 |\n"
            "| 3 | Suma 1/3 + 1/6. Di el denominador común antes de anotar. | 1/2 |\n"
            "| 4 | ¿Por qué 1/2 + 1/4 no es 2/6? | Hay que igualar denominadores primero |\n"
            "| 5 | Dibuja 3/4 de una naranja y 1/2 de otra. ¿Cuál es más? | 3/4 |",
        ),
    ],
    "Un ejemplo y un recuadro": [
        (
            "Prompt con recuadro",
            "Usa solo lo que está entre las líneas.\n"
            "---\n"
            "En el mercado de Tarqui, Juana compra 1/2 kg de arroz y 1/4 kg de "
            "lenteja. ¿Cuánto compró en total?\n"
            "---\n"
            "El tono y la longitud de los nuevos ítems tienen que parecerse a "
            "este. Si un dato no está ahí, escribe: no está en el texto.",
        ),
        (
            "Esperamos: dos ítems al mismo tono",
            "| # | Consigna | Respuesta |\n"
            "| 1 | En el mercado de Tarqui, Luis compra 1/3 kg de frejol y "
            "1/6 kg de arroz. ¿Cuánto compró en total? | 1/2 kg |\n"
            "| 2 | Juana ya lleva 1/2 kg. Si agrega 1/8 kg de azúcar, ¿cuánto "
            "pesa la funda? | 5/8 kg |",
        ),
    ],
    "Guía de ejercicios de tu temario": [
        (
            "Prompt de la guía",
            "Eres docente de matemática de séptimo. Ya vieron que 1/2 y "
            "2/4 son lo mismo. Arma 6 ejercicios de suma con distinto "
            "denominador: 2 de entrada, 2 de práctica, 2 desafiantes. La "
            "hora dura 45 minutos. Formato: lista numerada. Al final, clave "
            "en otro bloque. No pidas contar trozos.",
        ),
        (
            "Esperamos: la guía lista para fotocopiar",
            "| # | Consigna | Respuesta |\n"
            "| 1 | ¿1/2 y 2/4 son la misma cantidad? | Sí |\n"
            "| 2 | Un quintal se parte en 4. ¿Cuánto es 1/4 + 1/2? | 3/4 |\n"
            "| 3 | Ana camina 2/3 y luego 1/6. ¿Cuánto recorrió? | 5/6 |\n"
            "| 4 | Suma 1/3 + 1/6. Di el denominador común. | 1/2 |\n"
            "| 5 | ¿Por qué 1/2 + 1/4 no es 2/6? | Primero se iguala el denominador |\n"
            "| 6 | Inventa un problema del mercado que sume 1/5 + 2/5. | 3/5, con un enunciado del mercado |",
        ),
    ],
    "Resumen para quien no vino o no leyó": [
        (
            "Prompt para el grupo de familias",
            "Escribe 8 líneas para el grupo de WhatsApp de las familias. "
            "Qué vimos hoy en 7.º (suma de fracciones con distinto "
            "denominador) y una pregunta que pueden hacer en casa. Tono "
            "respetuoso, sin siglas.",
        ),
        (
            "Esperamos: la nota que pegas al grupo",
            "Hoy en séptimo sumamos fracciones que no tienen el mismo "
            "abajo. No es restar ni simplificar todavía: es poner las "
            "partes en la misma medida y después sumar.\n"
            "En casa pueden preguntar: si partes una naranja en 2 y otra en 4, "
            "¿cuánto es media más un cuarto?",
        ),
    ],
    "Una hora de 45 minutos, no un temario infinito": [
        (
            "Prompt de la hora",
            "Eres docente de matemática de séptimo. Diseña 45 minutos "
            "sobre suma de fracciones con distinto denominador. Ya vieron "
            "que 1/2 y 2/4 son lo mismo. Incluye: 8 minutos de apertura, 20 de práctica "
            "guiada, 12 de trabajo individual, 5 de cierre. Di qué hace el "
            "docente y qué hace el estudiante. Formato: tabla tiempo | "
            "momento | qué hace quién. Los bloques deben sumar 45.",
        ),
        (
            "Esperamos: el plan de los 45 minutos",
            "| Tiempo | Momento | Qué hace quién |\n"
            "| 8 min | Apertura | El docente proyecta 1/2 y 2/4. Pregunta: "
            "¿son la misma cantidad? Los estudiantes responden en voz alta. |\n"
            "| 20 min | Práctica guiada | Resuelven juntos 1/4+1/2, 1/3+1/6 y "
            "2/3+1/6 en el pizarrón. El docente nombra el denominador común. |\n"
            "| 12 min | Individual | Cada quien resuelve cuatro ítems en la "
            "hoja. El docente circula. |\n"
            "| 5 min | Cierre | Un estudiante dicta la regla: mismo "
            "denominador antes de sumar. Suma: 8+20+12+5 = 45. |",
        ),
    ],
    "El primer borrador no se fotocopia": [
        (
            "Prompt de una pasada",
            "Acorta los enunciados. Se leen en voz alta, no se copian del "
            "pizarrón. Una oración. No cambies las fracciones.",
        ),
        (
            "Esperamos: el enunciado que sí se puede dictar",
            "Antes: «Considerando que las fracciones representan partes de un "
            "todo, determina el resultado de la operación indicada.»\n"
            "Después: «Suma 1/4 + 1/2. Di el denominador común en voz alta.»",
        ),
    ],
    "Revisa antes de fotocopiar": [
        (
            "Primer resultado, sin revisar",
            "| # | Consigna | Respuesta |\n"
            "| 1 | A pizza costs €3. Add 1/4 + 1/2. | 2/6 |\n"
            "| 2 | Según el Ministerio, el 80% ya sabe esto. | — |\n"
            "| 3 | Despeja x en 2x + 1/3 = 1. | Álgebra de otro grado |",
        ),
        (
            "Esperamos: la hoja después de los cinco chequeos",
            "| # | Consigna | Respuesta |\n"
            "| 1 | Un quintal se parte en 4. ¿Cuánto es 1/4 + 1/2? | 3/4 |\n"
            "| 2 | ¿Por qué 1/2 + 1/4 no es 2/6? | Primero se iguala el denominador |\n"
            "| 3 | Suma 1/3 + 1/6. Di el denominador común. | 1/2 |",
        ),
    ],
    "Por qué trabaja con tus fuentes": [
        (
            "Prompt al cuaderno",
            "Usa solo las fuentes de este cuaderno. Define quebrado y cita "
            "el pasaje. Si no está, di que no está.",
        ),
        (
            "Esperamos: una cita que tienes que abrir",
            "El modelo dice: «El capítulo define quebrado como parte de la "
            "unidad (cita 3).»\n"
            "Abres la cita 3: el párrafo habla de decimales, no de quebrados. "
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
            "| Guía | Equivalente no es simplificar. Primero igualas el denominador. |\n"
            "| Preguntas | 1) ¿Qué es un denominador común? 2) Suma 1/3 + 1/6. 3) ¿Por qué 1/2 + 1/4 no es 2/6? |\n"
            "| Familias | Hoy igualamos denominadores para poder sumar. Pregunten: media naranja más un cuarto, ¿cuánto es? |",
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
            "| Aún no distingue | ¿1/2 y 2/4 son la misma cantidad? Sí o no, "
            "y por qué con un dibujo. | Señala las dos partes iguales. |\n"
            "| Nivel de la clase | Suma 1/3 + 1/6 y explica el denominador "
            "que usaste. | El 6 y la suma 1/2. |\n"
            "| Ya argumenta | ¿Por qué 1/2 + 1/4 no puede ser 2/6? | "
            "Contrasta sumar numeradores a ciegas con igualar primero. |",
        ),
    ],
    "Excelente, bueno, regular no mide": [
        (
            "Prompt con rúbrica hueca",
            "Califica este párrafo: «Las fracciones se suman si tienen el "
            "mismo abajo.» Usa excelente, bueno o regular y pon un número "
            "sobre 100.",
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
            "Escribe un prompt para generar material de TU próxima clase. "
            "Si aún no tienes el tema, usa séptimo: sumar fracciones "
            "con distinto denominador (un cuarto más un medio). No pidas "
            "contar trozos de un pastel.\n\n"
            "Tiene que: darle un rol al modelo, decir para quién es "
            "(el grado), qué ya vieron, cuántos ítems, y el formato "
            "(tabla, lista u otro). Si puedes, pega un ejemplo corto "
            "de cómo debe verse un ítem.\n\n"
            "Di qué tienen que saber hacer, no solo el nombre del tema."
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
