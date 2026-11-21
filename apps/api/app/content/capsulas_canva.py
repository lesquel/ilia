"""Curso «Una lámina en Canva»: cápsulas de video.

Cada video es una grabación real de Canva (cuenta de prueba en español, sin
datos personales en pantalla) con Lía presentando y voz sintética. El borrador
es el que devolvió Canva IA, sin retocar antes de grabar: su idea principal no
coincidía con la lectura y el video la corrige. Narración:
`media/cursos/capsulas-canva/real.json`. Caso: Rosa, Lengua de 7.º EGB
(caso armado). Destreza LL.3.3.3.
"""

from typing import Any

Lesson = tuple[str, str, int, str] | tuple[str, str, int, str, str]

SLUG = "lamina-en-canva"
MEDIA_PREFIX = "cursos/capsulas-canva/"


def _video(title: str, seconds: int, body: str, media_name: str) -> Lesson:
    return (title, "video", seconds, body.strip(), f"{MEDIA_PREFIX}{media_name}.mp4")


def _text(title: str, seconds: int, body: str) -> Lesson:
    return (title, "text", seconds, body.strip())


ANTES_DE_EMPEZAR = """
Una lámina para proyectar que separa el tema, la idea principal y un detalle de la lectura. Eso es lo que Rosa, docente de Lengua de séptimo (un caso armado para el curso), arma en Canva en cuatro videos cortos grabados de verdad, con Lía de guía.

Canva IA hace el borrador en un par de minutos. Lo que no hace es leer tu lectura como la lees tú: en el video, la idea principal que propuso no era la del texto. Por eso el curso dedica más tiempo a revisar que a generar.

Con una cuenta gratis de Canva, la IA tiene un límite de usos al mes. Si tu institución tiene Canva para Educación, es gratis para docentes; pregunta en tu escuela.
"""

V1 = """
Rosa le describe a Canva IA la lámina en pocas palabras: para quién es, de qué lectura, y que tenga el tema, la idea principal y un detalle, con letra grande.

El borrador se ve bien. Pero la idea principal decía «la escuela cultiva un huerto para aprender y trabajar en equipo», y la lectura dice otra cosa: «una tarea grande sale bien cuando cada uno cumple su parte» (LL.3.3.3).

:::pregunta El borrador de Canva IA se ve profesional. ¿Qué revisas primero?
- [ ] Los colores y la letra.
  Importan, pero una lámina bonita con la idea equivocada enseña la idea equivocada.
- [x] Que cada texto diga lo que dice la lectura.
  La IA no leyó tu lectura como tú. El tema, la idea y el detalle se comparan con el texto.
:::
"""

V2 = """
En el editor, doble clic sobre el texto, seleccionar todo y escribir encima. Rosa cambia la idea principal por la de la lectura y el detalle general por uno que está en el texto: «en marzo cosecharon los primeros tomates».
"""

V3 = """
La imagen la generó la IA: no son estudiantes reales. Si quieres usar fotos de tu curso, con permiso de las familias.

«Presentar» muestra la lámina en pantalla completa. Mírala como desde la última fila: si algo no se lee, agranda la letra o quita texto.
"""

V4 = """
«Compartir», «Descargar», PDF. Para imprimir, el valor «Impresión». El archivo queda en tu computadora y la lámina se puede proyectar aunque en el aula no haya internet.
"""

PARA_LLEVAR = """
1. Pide el borrador en pocas palabras: para quién, de qué lectura y qué partes.
2. Compara cada texto con la lectura antes de usarla.
3. Imágenes generadas, no fotos de tus estudiantes sin permiso.
4. Mírala en pantalla completa, como desde el fondo del aula.
5. Descárgala en PDF.
"""

CANVA_CAPSULAS_COURSE: dict[str, Any] = {
    "slug": SLUG,
    "title": "Una lámina en Canva",
    "summary": "Cuatro videos grabados en Canva: del borrador de la IA a la lámina revisada",
    "description": (
        "Canva IA arma el borrador de una lámina en minutos; tú la corriges para que diga lo "
        "que dice la lectura, revisas la imagen, la miras como desde el fondo del aula y la "
        "descargas en PDF. Cuatro videos cortos grabados en Canva de verdad. Se sigue a Rosa, "
        "docente de Lengua de séptimo."
    ),
    "level": "beginner",
    "modules": [
        (
            "Tu lámina en Canva, paso a paso",
            [
                _text("Antes de empezar", 120, ANTES_DE_EMPEZAR),
                _video("Pide el borrador", 59, V1, "c1-pide-el-borrador"),
                _video("Tu texto en la lámina", 36, V2, "c2-tu-texto-en-la-lamina"),
                _video("Mírala desde el fondo del aula", 35, V3, "c3-mirala-desde-el-fondo"),
                _video("Descárgala en PDF", 34, V4, "c4-descargala-en-pdf"),
                _text("Para llevar", 90, PARA_LLEVAR),
            ],
        ),
    ],
}

CANVA_CAPSULAS_ACTIVITIES: list[dict[str, Any]] = [
    {
        "course_slug": SLUG,
        "module_position": 1,
        "title": "Taller · El pedido de tu lámina",
        "statement": (
            "Escribe el pedido que le harías a Canva IA para una lámina de tu próxima clase: "
            "para quién es, de qué lectura o tema, y qué partes debe tener, con letra grande. "
            "Empieza con «Eres docente de [materia] de [grado]». Si enseñas Lengua en 7.º, "
            "pide el tema, la idea principal y un detalle (LL.3.3.3).\n\n"
            "Debajo, copia de tu lectura la idea principal y un detalle tal como están en el "
            "texto: con eso vas a revisar el borrador. No incluyas fotos, nombres ni datos de "
            "tus estudiantes."
        ),
        "checks": {
            "requires_role": True,
            "requires_format": True,
            "required_terms": [
                ["lámina", "lamina", "diapositiva"],
                ["idea principal", "tema"],
                ["letra", "grande", "proyectar"],
            ],
            "min_length": 45,
        },
    },
]
