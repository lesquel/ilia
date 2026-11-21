"""Curso «Gemini Notebook paso a paso» (antes NotebookLM): cápsulas de video.

Cada video es una grabación real de Gemini Notebook (cuenta de prueba, sin
datos personales en pantalla) con Lía presentando y voz sintética. Lo que la
herramienta responde no se edita. La fuente es una lectura propia de una
página (`media/cursos/capsulas-notebook/lectura-huerto.pdf`). Narración:
`media/cursos/capsulas-notebook/real.json`. Caso: Rosa, Lengua de 7.º EGB
(caso armado). Destreza LL.3.3.3; LL.3.3.6 cuando se habla de la fuente.
"""

from typing import Any

Lesson = tuple[str, str, int, str] | tuple[str, str, int, str, str]

SLUG = "notebooklm-paso-a-paso"
MEDIA_PREFIX = "cursos/capsulas-notebook/"


def _video(title: str, seconds: int, body: str, media_name: str) -> Lesson:
    return (title, "video", seconds, body.strip(), f"{MEDIA_PREFIX}{media_name}.mp4")


def _text(title: str, seconds: int, body: str) -> Lesson:
    return (title, "text", seconds, body.strip())


ANTES_DE_EMPEZAR = """
NotebookLM ahora se llama Gemini Notebook y está en notebook.google.com. Funciona con tu cuenta de Google, sin pagar.

La diferencia con un chat común es una sola: Gemini Notebook responde con lo que tú le subes. Si le das las páginas de tu libro o tu propia lectura, las preguntas, las guías y los cuestionarios salen de ahí, y cada respuesta trae la cita de dónde la sacó.

Son cuatro videos de menos de un minuto, grabados en la herramienta de verdad, y en cada uno te acompaña Lía, el ave de ILIA. Rosa, docente de Lengua de séptimo (un caso armado para el curso), usa una lectura de una página sobre el huerto escolar. Haz lo mismo con tu materia mientras miras.
"""

V1 = """
Rosa toca «Nuevo cuaderno», abre «Fuentes» y sube su lectura en PDF. También se puede subir una foto de las páginas del libro, un archivo de Drive o pegar el texto.

Sube solo lo que quieres que use: el capítulo de esta semana, no el libro entero.
"""

V2 = """
En el chat, Rosa pide cinco preguntas que se contesten solo con la lectura y que separen el tema, la idea principal y los detalles (LL.3.3.3).

Los numeritos grises junto a cada respuesta son las citas. Al tocar uno, la lectura se abre a la izquierda con la frase exacta resaltada. Así se revisa cada respuesta en segundos.

:::pregunta Una respuesta de Gemini Notebook no trae ninguna cita. ¿Qué haces?
- [ ] La uso igual: salió del cuaderno.
  Sin cita no sabes si salió de tu lectura o de lo que el modelo ya sabía.
- [x] La busco yo en la lectura antes de usarla.
  Si no la encuentras en el texto, esa respuesta no va en la hoja.
:::
"""

V3 = """
En Studio, «Cuestionario» abre las opciones antes de crearlo: cuántas preguntas, la dificultad, el tipo y un cuadro para decir qué quieres medir.

En el video, Rosa pidió tema, idea principal y detalles, y la primera pregunta que salió fue de un detalle suelto: con qué materiales empezó el huerto. El cuestionario se revisa completo antes de compartirlo.
"""

V4 = """
Rosa le pregunta en qué año se fundó la escuela y cuántos estudiantes tiene. Gemini Notebook responde que la lectura no tiene esa información. No inventa: solo usa lo que le diste.

Por eso importa qué subes. Tu libro o tu material, sí. Listas con nombres, notas, fotos o diagnósticos de tus estudiantes, nunca: lo que subes, lo usa.
"""

PARA_LLEVAR = """
1. Un cuaderno por tema, con las páginas que vas a trabajar.
2. Cada respuesta se revisa con su cita.
3. Lo que crea Studio se revisa completo antes de compartirlo.
4. Pregúntale algo que no está en tu fuente: tiene que decir que no lo encuentra.
5. Nada de datos de estudiantes en las fuentes.
"""

NOTEBOOK_CAPSULAS_COURSE: dict[str, Any] = {
    "slug": SLUG,
    "title": "Gemini Notebook paso a paso",
    "summary": "Cuatro videos grabados en la herramienta: tu lectura como fuente",
    "description": (
        "Gemini Notebook (antes NotebookLM) responde con lo que tú le subes. En cuatro "
        "videos cortos grabados de verdad, subes tu lectura, pides preguntas con citas, "
        "creas un cuestionario desde Studio y compruebas que no invente lo que no está en "
        "tu fuente. Se sigue a Rosa, docente de Lengua de séptimo."
    ),
    "level": "beginner",
    "modules": [
        (
            "Tu lectura en Gemini Notebook",
            [
                _text("Antes de empezar", 120, ANTES_DE_EMPEZAR),
                _video("Tu lectura como fuente", 48, V1, "n1-tu-lectura-como-fuente"),
                _video("Preguntas con citas", 45, V2, "n2-preguntas-con-citas"),
                _video("Un cuestionario desde Studio", 65, V3, "n3-cuestionario-desde-studio"),
                _video("Lo que no está en tu lectura", 37, V4, "n4-lo-que-no-esta-en-la-fuente"),
                _text("Para llevar", 90, PARA_LLEVAR),
            ],
        ),
    ],
}

NOTEBOOK_CAPSULAS_ACTIVITIES: list[dict[str, Any]] = [
    {
        "course_slug": SLUG,
        "module_position": 1,
        "title": "Taller · El pedido para tu cuaderno",
        "statement": (
            "Elige las páginas de tu libro o la lectura que vas a trabajar la próxima semana. "
            "Escribe qué fuente subirías a Gemini Notebook y el pedido que le harías en el chat. "
            "Empieza con «Eres docente de [materia] de [grado]» y pide preguntas que se contesten "
            "solo con esa fuente, con la clave aparte. Si enseñas Lengua en 7.º, que separen el "
            "tema de la idea principal (LL.3.3.3).\n\n"
            "Debajo, escribe una pregunta de prueba sobre algo que NO está en tu fuente, para "
            "comprobar que no invente. No incluyas nombres ni datos de tus estudiantes."
        ),
        "checks": {
            "requires_role": True,
            "requires_format": True,
            "required_terms": [
                ["fuente", "lectura", "libro", "páginas", "paginas"],
                ["solo", "únicamente", "unicamente"],
                ["clave"],
            ],
            "min_length": 45,
        },
    },
]
