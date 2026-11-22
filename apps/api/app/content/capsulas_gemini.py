"""Curso «Gemini paso a paso»: cápsulas de video de un minuto.

Cada video es una grabación real de Gemini (cuenta de prueba, sin datos
personales en pantalla) con Lía presentando y voz sintética. Lo que Gemini
responde no se edita. Narración: `media/cursos/capsulas-gemini/real.json`;
grabación y montaje: `media/video-tools/src/real/`. Caso: Rosa, Lengua de 7.º EGB, escuela
fiscal de Portoviejo (caso armado). Destreza LL.3.3.3, recuperación LL.3.3.4.
"""

from typing import Any

Lesson = tuple[str, str, int, str] | tuple[str, str, int, str, str]

SLUG = "gemini-paso-a-paso"
MEDIA_PREFIX = "cursos/capsulas-gemini/"


def _video(title: str, seconds: int, body: str, media_name: str) -> Lesson:
    return (title, "video", seconds, body.strip(), f"{MEDIA_PREFIX}{media_name}.mp4")


def _text(title: str, seconds: int, body: str) -> Lesson:
    return (title, "text", seconds, body.strip())


ANTES_DE_EMPEZAR = """
Son cuatro videos de un minuto, y en cada uno te acompaña Lía, el ave de ILIA. Cada video muestra una sola cosa, grabada en Gemini de verdad, y la idea es que la hagas al mismo tiempo, con Gemini abierto en otra pestaña y tu materia.

Vamos a seguir a Rosa, que enseña Lengua en séptimo en una escuela fiscal de Portoviejo. Rosa es un caso armado para el curso. Lo que prepara es lo de siempre en séptimo: un párrafo y cinco preguntas que se contestan con el texto y que separan el tema de la idea principal.

Lo que ves en los videos es lo que Gemini respondió, sin editar. La tuya va a salir distinta aunque escribas lo mismo, y está bien: lo que se aprende es a pedir y a revisar. Gemini cambia sus botones seguido; si uno no está donde lo ves, búscalo cerca.

Al final tienes la hoja de tu próxima clase, revisada, en un documento listo para imprimir.
"""

V1 = """
Rosa toca «Nuevo chat» y escribe el pedido en tres partes: quién es y cuánto dura su clase, la tarea, y cómo quiere de vuelta el material.

Hazlo tú ahora con tu materia. Si no enseñas Lengua, cambia el párrafo por lo que trabajas esta semana; las tres partes sirven igual.

:::pregunta Gemini te devuelve la hoja y se ve bien. ¿Qué haces antes de imprimirla?
- [ ] La imprimo; para eso la pedí.
  Se ve bien no es lo mismo que está bien. Una pregunta que no sale del texto se nota cuando la contestas, no cuando la lees.
- [x] Contesto yo las cinco preguntas con el párrafo al lado.
  Así aparece la pregunta que se responde con un dato suelto, o la clave que dice algo que el párrafo no dice.
:::
"""

V2 = """
En la hoja que devolvió Gemini, la tercera, la cuarta y la quinta pregunta pedían datos sueltos, como qué plantas se cultivan. No muestran si el estudiante distingue el tema de la idea principal, que es lo que trabaja séptimo (LL.3.3.3).

En vez de empezar otro chat, Rosa escribe debajo de la respuesta: qué preguntas, qué tienen de malo y qué quiere en su lugar. Y cierra con «deja lo demás igual». En el video, Gemini cambió solo esas tres; el párrafo y las dos primeras quedaron idénticos.

Prueba con tu hoja: elige la pregunta más floja y pide un solo cambio.
"""

V3 = """
Para los chicos que todavía leen despacio no hace falta otra hoja: la misma, con un escalón antes. Frases cortas y numeradas, y una pista de en qué frase buscar. Es releer y buscar en el texto (LL.3.3.4), antes de pedirles la idea principal.

Compara siempre la versión corta con la original: al acortar, a veces se pierde una idea. Y fíjate en lo que Rosa no escribe: ningún nombre. Gemini no necesita saber quiénes son, le basta con saber qué les cuesta. Nombres, notas o diagnósticos de tus estudiantes no se pegan en el chat.
"""

V4 = """
Debajo de la respuesta, en los tres puntos, está «Exportar a Documentos». Cuando Gemini avisa que creó el documento, tocas «Abrir Documentos» y ya está en tu Drive.

En el documento haces lo último a mano: borrar lo que escribió Gemini antes de la hoja (en el video, «¡Totalmente de acuerdo!» y una línea más), poner el nombre de la escuela y la fecha, y cortar la clave para guardarla aparte.
"""

PARA_LLEVAR = """
Lo que te llevas de este curso cabe en cuatro líneas:

1. Un chat nuevo por cada hoja, y el pedido en tres partes: quién eres, la tarea y cómo la quieres de vuelta.
2. Contestas tú las preguntas antes de imprimir.
3. Los cambios se piden de uno en uno, con «deja lo demás igual».
4. Ningún nombre de estudiante en el chat.

Para el taller, arma el pedido de tu próxima clase con estas cuatro cosas.
"""

GEMINI_CAPSULAS_COURSE: dict[str, Any] = {
    "slug": SLUG,
    "title": "Gemini paso a paso",
    "summary": "Cuatro videos grabados en Gemini: del nuevo chat a la hoja impresa",
    "description": (
        "Cuatro videos cortos grabados en Gemini de verdad, cada uno con una sola acción: "
        "escribir el primer pedido, pedir un cambio sin empezar de cero, hacer la versión "
        "para quien todavía lee despacio y pasar la hoja a un documento. Se sigue a Rosa, "
        "docente de Lengua de séptimo. Terminas con la hoja de tu próxima clase."
    ),
    "level": "beginner",
    "modules": [
        (
            "Tu hoja con Gemini, paso a paso",
            [
                _text("Antes de empezar", 120, ANTES_DE_EMPEZAR),
                _video("El primer pedido", 68, V1, "g1-el-primer-pedido"),
                _video("Un cambio sin empezar de cero", 58, V2, "g2-un-cambio-sin-empezar-de-cero"),
                _video("Para quien todavía lee despacio", 56, V3, "g3-para-quien-va-atrasado"),
                _video("De Gemini a la hoja impresa", 61, V4, "g4-de-gemini-a-la-hoja"),
                _text("Para llevar", 90, PARA_LLEVAR),
            ],
        ),
    ],
}

GEMINI_CAPSULAS_ACTIVITIES: list[dict[str, Any]] = [
    {
        "course_slug": SLUG,
        "module_position": 1,
        "title": "Taller · El pedido de tu próxima hoja",
        "statement": (
            "Escribe el pedido que vas a pegar en Gemini para la hoja de tu próxima clase. "
            "Empieza con «Eres docente de [materia] de [grado]» y cuánto dura tu clase. "
            "Pide un texto corto y cinco preguntas que se contesten con ese texto; si enseñas "
            "Lengua en 7.º, que separen el tema de la idea principal (LL.3.3.3). "
            "Di cómo lo quieres de vuelta: la clave aparte, al final.\n\n"
            "Debajo, escribe el mensaje de un solo cambio que mandarías si una pregunta se "
            "contesta con un dato suelto, y termina ese mensaje con «deja lo demás igual». "
            "No incluyas nombres ni datos de tus estudiantes."
        ),
        "checks": {
            "requires_role": True,
            "requires_format": True,
            "required_terms": [
                ["minutos", "hora de clase"],
                ["cinco preguntas", "5 preguntas"],
                ["clave"],
                ["deja lo demás igual", "deja lo demas igual"],
            ],
            "min_length": 45,
        },
    },
]
