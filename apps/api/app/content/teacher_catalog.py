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
        "Este curso no es sobre inteligencia artificial en general. Es sobre "
        "el pedido que le haces a un modelo para que te arme material que "
        "sí puedes llevar a tu próxima hora.\n\n"
        "Si llegas de la jornada y te quedan dos horas de planificación, "
        "el modelo puede redactar un borrador. Tú decides qué se fotocopia. "
        "Esa división —el modelo escribe, tú respondes por el aula— es el "
        "criterio de todo lo que sigue.\n\n"
        "En esta hora vas a ver por qué un prompt corto produce material "
        "de nadie; cómo se pide con rol, audiencia, tarea y formato; "
        "cómo se mejora el primer borrador; y vas a escribir el prompt "
        "de tu propia clase. No hay examen de opción múltiple. La "
        "evidencia es ese prompt.\n\n"
        "Trae a la cabeza un tema real: el de mañana o el del lunes. Si no "
        "tienes uno, usa fracciones de séptimo. El método es el mismo "
        "para lengua, sociales o ciencias.",
    ),
    (
        "Qué puede y qué no puede un modelo",
        "text",
        _minutes(5),
        "Un modelo de lenguaje predice texto que suena plausible. No ha "
        "estado en tu aula. No sabe quién faltó, ni qué ya vieron, ni si "
        "el libro de la escuela dice «quebrados» o «fracciones».\n\n"
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
        "enseña las cuatro piezas que evitan eso.\n\n"
        "Tampoco sirve para inventar una fuente. Si pide «según el "
        "Ministerio» y tú no pegaste el decreto, esa cita es teatro.\n\n"
        "Regla práctica: nada de lo que genere el modelo se imprime sin "
        "que tú lo leas. Un error de un modelo en una guía de séptimo se "
        "vuelve error de veinte cuadernos.",
    ),
    (
        "Anatomía de un prompt que sirve",
        "text",
        _minutes(7),
        "Las guías para docentes de 2026 —OpenAI, Google y el Ministerio "
        "de Educación del Reino Unido— coinciden en lo mismo, con otros "
        "nombres: di la tarea, el aula y cómo lo quieres de vuelta. "
        "Si falta una pieza, el modelo la rellena con un promedio de "
        "internet.\n\n"
        "1. ROL. Quién es el modelo. «Eres docente de matemática de "
        "séptimo en un colegio público.»\n"
        "2. AUDIENCIA. Para quién es el material. No es lo mismo el "
        "estudiante, la familia o el docente suplente. «Los enunciados "
        "se leen en voz alta; hay quienes aún mezclan equivalente y "
        "simplificar.»\n"
        "3. CONTEXTO. Qué ya vieron, cuánto dura la hora, qué no debe "
        "salir. «Ya trabajamos fracciones equivalentes. La hora es de "
        "45 minutos. No uses ejemplos en euros.»\n"
        "4. TAREA. Qué tiene que producir, con cantidad y dificultad. "
        "«5 ejercicios de suma con distinto denominador, de menor a mayor "
        "dificultad.»\n"
        "5. FORMATO. Cómo lo quieres de vuelta. «Tabla: consigna | "
        "respuesta esperada.»\n\n"
        "Compáralo.\n\n"
        "Flojo: «Haz un ejercicio de fracciones.»\n\n"
        "Útil: «Eres docente de matemática de séptimo. Los estudiantes "
        "ya vieron equivalentes. Arma 5 ejercicios de suma con distinto "
        "denominador, de menor a mayor dificultad. Devuélvelo en una "
        "tabla: consigna | respuesta esperada. No inventes un dato que "
        "yo no te di.»\n\n"
        "El segundo no es más largo por adorno. Cada dato le quita al "
        "modelo una decisión. Lo mismo vale en lengua («párrafo de 8 "
        "líneas para 2.º de bachillerato, tono formal») o en sociales "
        "(«línea de tiempo de 6 hitos, solo el período que marca el "
        "texto»).",
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
        "respetuoso, sin siglas.»\n\n"
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
        "pide álgebra de cuarto de bachillerato no sirve.\n"
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
        "tu próxima clase: rol, audiencia, tarea y formato. Eso es la "
        "evidencia del curso.",
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
        "que van a leer.\n\n"
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


TEACHER_COURSES: list[dict[str, Any]] = [
    {
        "slug": "prompting-para-docentes",
        "title": "Prompting para docentes",
        "summary": "El prompt de tu próxima clase, no un examen de teoría",
        "description": (
            "Aprendes a pedirle a un modelo material que sí puedes llevar al "
            "aula: rol, audiencia, tarea y formato; un ejemplo; y una "
            "segunda pasada. Cierras escribiendo el prompt de tu propia "
            "clase. El modelo redacta; tú decides qué se fotocopia."
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
            "Escribe un prompt para generar material de TU próxima clase "
            "(o de fracciones de séptimo, si aún no tienes el tema).\n\n"
            "Tiene que: darle un rol al modelo, decir para quién es "
            "(grado o audiencia), qué ya vieron, una cantidad concreta "
            "de ítems, y el formato de la respuesta (tabla, lista u "
            "otro). Si puedes, pega un ejemplo corto de cómo debe verse "
            "un ítem.\n\n"
            "Menciona el tema de la clase con su nombre (por ejemplo "
            "fracciones, o el tema real que vas a dar)."
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
