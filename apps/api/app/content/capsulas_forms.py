"""Curso «Una prueba corta en Google Forms»: cápsulas de video, ruta gratuita.

Gemini dentro de Forms («Ayúdame a crear») necesita un plan de Google Workspace
o Google AI de pago (support.google.com/docs/answer/16346789). Por eso el
curso enseña la ruta gratis: Gemini escribe las preguntas y Forms corrige.
Cada video es una grabación real (cuenta de prueba, sin datos personales en
pantalla) con Lía presentando y voz sintética. Narración:
`media/cursos/capsulas-forms/real.json`. Caso: Rosa, Lengua de 7.º EGB
(caso armado). Destreza LL.3.3.3.
"""

from typing import Any

Lesson = tuple[str, str, int, str] | tuple[str, str, int, str, str]

SLUG = "prueba-corta-en-forms"
MEDIA_PREFIX = "cursos/capsulas-forms/"


def _video(title: str, seconds: int, body: str, media_name: str) -> Lesson:
    return (title, "video", seconds, body.strip(), f"{MEDIA_PREFIX}{media_name}.mp4")


def _text(title: str, seconds: int, body: str) -> Lesson:
    return (title, "text", seconds, body.strip())


ANTES_DE_EMPEZAR = """
Una prueba corta en Google Forms se corrige sola y te dice qué pregunta falló más el curso. Eso es lo que vas a armar en cuatro videos de menos de un minuto y medio, grabados en las herramientas de verdad, con Lía de guía.

Una aclaración antes de empezar: Forms tiene un botón con Gemini que escribe las preguntas solo, pero pide un plan de pago de Google. Con una cuenta gratis se hace en dos pasos: Gemini escribe las preguntas y tú las pasas a Forms. Es lo que muestran los videos.

Rosa, docente de Lengua de séptimo (un caso armado para el curso), usa la lectura del huerto escolar.
"""

V1 = """
Rosa le pide a Gemini cinco preguntas de opción múltiple: una del tema, una de la idea principal y tres para clasificar frases (LL.3.3.3). Pide opciones incorrectas creíbles y un formato fácil de copiar: cada opción en su línea y la correcta con un asterisco.

Antes de copiar, se leen. En el video, la opción D de la tercera pregunta decía que la frase era «un error de lectura»: nadie la elegiría, así que no mide nada. Se cambia por un detalle real del texto.

:::pregunta ¿Para qué sirve que las opciones incorrectas sean creíbles?
- [ ] Para que la prueba sea más difícil.
  No se trata de que sea difícil, sino de que diga algo.
- [x] Para ver qué confunden tus estudiantes.
  Si eligen el detalle en vez de la idea principal, ya sabes qué volver a explicar.
:::
"""

V2 = """
En forms.google.com, «Formulario en blanco». Un título que tus estudiantes reconozcan, y en «Configuración», «Convertir en cuestionario». Desde ahí cada pregunta puede tener puntos y respuesta correcta.
"""

V3 = """
Se pega la pregunta, cada opción en su línea (Enter crea la siguiente) y en «Clave de respuesta» se marca la correcta y los puntos. «Listo», y lo mismo con las demás.
"""

V4 = """
Para que alguien pueda responder, el formulario se publica. Fíjate en quién puede responder: cualquier persona que tenga el vínculo.

Antes de mandarlo al curso, ábrelo con ese vínculo y contéstalo tú. En «Respuestas» aparece qué pregunta falla más y cuántos eligieron cada opción; cuando contesten tus estudiantes, ahí ves qué volver a explicar.

Una prueba no pide más datos de los necesarios: si no hace falta el correo de cada estudiante, no lo pidas.
"""

PARA_LLEVAR = """
1. Las preguntas salen de Gemini, pero las lees tú antes de copiarlas.
2. Opciones incorrectas creíbles: un detalle, el tema, nunca algo absurdo.
3. «Convertir en cuestionario» y la clave en cada pregunta.
4. La contestas tú primero, con el mismo vínculo que vas a mandar.
5. El resumen de «Respuestas» te dice qué volver a explicar.
"""

FORMS_CAPSULAS_COURSE: dict[str, Any] = {
    "slug": SLUG,
    "title": "Una prueba corta en Google Forms",
    "summary": "Cuatro videos grabados en Gemini y Forms: la prueba que se corrige sola",
    "description": (
        "Con una cuenta gratis: Gemini escribe cinco preguntas de opción múltiple, las "
        "pasas a Google Forms en modo cuestionario, marcas la clave y la contestas tú antes "
        "de mandarla al curso. Cuatro videos cortos grabados en las herramientas de verdad. "
        "Se sigue a Rosa, docente de Lengua de séptimo."
    ),
    "level": "beginner",
    "modules": [
        (
            "Tu prueba en Forms, paso a paso",
            [
                _text("Antes de empezar", 120, ANTES_DE_EMPEZAR),
                _video("Las preguntas, desde Gemini", 69, V1, "f1-las-preguntas-desde-gemini"),
                _video(
                    "El formulario, en modo cuestionario",
                    35,
                    V2,
                    "f2-el-formulario-en-modo-cuestionario",
                ),
                _video("La pregunta y su clave", 41, V3, "f3-la-pregunta-y-su-clave"),
                _video("Pruébalo antes de enviarlo", 57, V4, "f4-pruebalo-antes-de-enviarlo"),
                _text("Para llevar", 90, PARA_LLEVAR),
            ],
        ),
    ],
}

FORMS_CAPSULAS_ACTIVITIES: list[dict[str, Any]] = [
    {
        "course_slug": SLUG,
        "module_position": 1,
        "title": "Taller · El pedido de tu prueba corta",
        "statement": (
            "Escribe el pedido que le harías a Gemini para una prueba corta de tu próxima clase. "
            "Empieza con «Eres docente de [materia] de [grado]». Pide cinco preguntas de opción "
            "múltiple con cuatro opciones, que las incorrectas sean creíbles y que marque la "
            "correcta con un asterisco, cada opción en su propia línea. Si enseñas Lengua en 7.º, "
            "incluye el tema y la idea principal (LL.3.3.3).\n\n"
            "Debajo, escribe qué vas a revisar antes de copiarlas a Forms. No incluyas nombres "
            "ni datos de tus estudiantes."
        ),
        "checks": {
            "requires_role": True,
            "requires_format": True,
            "required_terms": [
                ["opción múltiple", "opcion multiple", "opciones"],
                ["correcta"],
                ["creíbles", "creibles", "incorrectas"],
            ],
            "min_length": 45,
        },
    },
]
