# Curso para docentes: diseño

Borrador de octubre de 2026. Reemplaza a los tres cursos por herramienta (prompting, NotebookLM, evaluación) y toma la ruta de [ruta-unidad.md](../ruta-unidad.md). La investigación de respaldo está en `reports/Qué aprenden los docentes sobre IA.md`, en la carpeta de afuera del repositorio.

## Lo que ya existe gratis, y por qué no basta con copiarlo

Google y MIT RAISE tienen un curso gratuito de 2 horas, [«IA generativa para educadores»](https://edu.exceedlms.com/student/path/1722666-ia-generativa-para-educadores), en español y con certificado. Enseña a escribir un pedido, evaluar el resultado y crear recursos. La versión de 2025 con Gemini y Gemini Notebook [solo está en inglés](https://grow.google/ai-for-educators/). Google también publica micro-sesiones de 15 minutos ([AI Educator Series](https://support.google.com/googleforeducation/answer/18558350?hl=en)), en inglés y coreano.

Si ILIA solo enseña dónde tocar y las piezas de un buen pedido, compite con un curso gratis de Google y del MIT, y pierde. Esto no hace distinto a ILIA:

- Un tutorial de botones de Gemini.
- La plantilla de un buen pedido (rol, contexto, tarea, formato). Es la misma de OpenAI, Google y Microsoft.
- Videos cortos. No hay evidencia de que el microaprendizaje en video funcione solo para docentes ([Kraft et al. 2018](https://education.umd.edu/sites/default/files/uploads/inline-files/Kraft%20Blazar%20Hogan_2018_The%20Effect%20of%20Teacher%20Coaching_Review%20of%20Educational%20Research.pdf)).

Esas tres cosas hacen falta, pero son el piso, no la diferencia.

## Lo que hace bueno a este curso

Cada principio sale de la investigación y se ve en el diseño de cada módulo.

| # | Principio | De dónde sale | Cómo se ve en ILIA |
|---|---|---|---|
| 1 | **Se califica la segunda versión, no solo la primera** | En los ensayos ingleses, «pocos docentes usaron preguntas de seguimiento para refinar sus prompts» ([NFER](https://www.nfer.ac.uk/publications/chatgpt-in-lesson-preparation-a-teacher-choices-trial/)). El grupo con formación conceptual pidió de forma «reflexiva-iterativa» ([Vietnam, JDLTE 2025](https://www.tandfonline.com/doi/full/10.1080/21532974.2025.2583516)) | El taller pide el pedido, la revisión y la corrección. ILIA califica las dos versiones |
| 2 | **Encontrar el error antes de imprimir** | Nadie entrena ni califica la revisión de lo que devuelve la IA | Un taller «Encuentra los errores»: ILIA da una hoja real con errores plantados y el docente marca cuáles son y por qué |
| 3 | **Se parte del material que el docente ya tiene** | Los docentes con experiencia prefieren adaptar sus planes antes que crear desde cero ([EEF Aila](https://educationendowmentfoundation.org.uk/news/ai-tool-reduced-primary-teachers-lesson-planning-time-by-a-quarter-but-views-on-the-tool-were-mixed)). Los programas efectivos usan «artefactos auténticos» ([LPI](https://learningpolicyinstitute.org/product/effective-teacher-professional-development-factsheet)) | El taller pide una hoja que el docente ya usa o su próxima clase, nunca un caso inventado |
| 4 | **El libro del Ministerio entra en el pedido** | Gemini no sabe qué libro usa el docente. En la prueba real clasificó un argumento como «utilidad práctica» y nombró la falacia «hombre de paja»; ninguna de las dos está en el libro de 2.º BGU | Cada módulo enseña a pegar en el pedido la lista o la página del libro que el docente ya usa |
| 5 | **Se explica la razón, no solo la receta** | Los programas que dan recetas tienen «muy poco impacto»; funcionan los que enseñan la razón de cada estrategia ([Kennedy 2016](https://journals.sagepub.com/doi/10.3102/0034654315626800)) | Cada paso del tutorial lleva una frase con el porqué |
| 6 | **Modelar, ensayar, retroalimentar, planificar y repetir en el aula** | Son los mecanismos que predicen el efecto en 104 estudios ([Sims et al. 2021](https://discovery.ucl.ac.uk/id/eprint/10136274/1/Teacher-professional-development.pdf)) | Video (modelar), pregunta en el texto (ensayar), taller calificado (retroalimentar), «para el lunes» (planificar) y la pregunta de la semana siguiente (repetir) |
| 7 | **Semanas, no un taller** | En Perú, un día de formación más licencia y diploma dejó un uso semanal en torno al 15 % ([Banco Mundial, preliminar](https://thedocs.worldbank.org/en/doc/758f145da8c1344652c51d575fd95379-0140022025/original/AI-teachers-CL-092725.pdf)) | Un módulo por semana durante 8 a 10 semanas, con un círculo de colegas por escuela |
| 8 | **Cada uno empieza donde está** | UNESCO advierte que la progresión no es igual en todos los aspectos ([UCL/UNESCO](https://discovery.ucl.ac.uk/id/eprint/10196729/1/UNESCO_AI_CFT_Final.pdf)) | Quien aprueba el taller de un módulo al primer intento puede saltarse sus videos |
| 9 | **Ejemplos reales, no inventados** | Una salida inventada enseña lo que el modelo «debería» hacer, no lo que hace | Los ejemplos del texto son respuestas reales de Gemini, guardadas tal cual salieron |

La ventaja que nadie más tiene: ILIA guarda cada pedido calificado. Con eso puede producir la primera evidencia en Ecuador sobre cómo piden los docentes y cómo mejoran. Para que eso valga, el juez automático se valida antes contra la nota de docentes expertos.

## Herramientas

- **Gemini** con la cuenta personal de Gmail del docente, grabado en el computador con OBS en `gemini.google.com`. Cada lección lleva una línea con el equivalente en la app del celular, porque solo un tercio de los hogares de Ecuador tiene computadora o tablet ([INEC TIC 2025](https://www.ecuadorencifras.gob.ec/tecnologias-de-la-informacion-y-comunicacion-tic/)). Con una cuenta personal, Google puede usar los chats para mejorar sus modelos y algunas personas pueden revisarlos ([Gemini Apps Privacy Hub](https://support.google.com/gemini/answer/13594961?hl=es)). Por eso el curso tiene una sola regla de privacidad, desde la primera lección: no se pegan nombres, notas ni datos de estudiantes.
- **Gemini Notebook** (antes NotebookLM) para trabajar con el material propio, desde el módulo de «tu propio material».
- **DeepSeek** como alternativa gratuita, solo para material sin datos de estudiantes. Guarda los datos en China y no tiene acuerdo con el Ministerio.
- **No se graba ninguna lección central sobre Gems**: dejan de estar disponibles en Workspace for Education desde junio de 2027 ([Classroom Help](https://support.google.com/edu/classroom/answer/16534159?hl=en)).

## El caso que recorre el curso

Andrés, docente de Lengua de 2.º de Bachillerato en un colegio fiscal de Manta. Su ficha está en [fichas/andres-2-bachillerato.md](../fichas/andres-2-bachillerato.md).

Andrés es un caso armado con el libro de 2.º BGU del Ministerio. Lo que le devuelve Gemini es real. En el video de bienvenida se dice así.

Si los estudiantes pueden usar Gemini ellos mismos se decide en los módulos 5 y 7. La edad mínima y el tipo de cuenta están por confirmar.

## Cómo está hecho cada módulo

Cada módulo es una serie de segmentos, y cada segmento es una lección en la app:

1. **Bienvenida a cámara.** Desde el módulo 2 abre con «¿cómo te fue?» sobre lo de la semana anterior.
2. **Preguntas rápidas** para ver de dónde parte cada uno.
3. **Videos de pantalla** de 2 a 4 minutos, grabados con OBS. El docente tiene Gemini abierto en otra pestaña y hace lo mismo con su materia.
4. **Lecturas** con los pasos, el porqué y la respuesta real que salió en el video.
5. **Revisa tú:** preguntas con un solo error cada una, siempre después de ver la revisión hecha.
6. **Taller** con nota.
7. **Para el lunes,** a cámara: qué hacer esta semana y qué viene.

Cuando exista el código, quien apruebe el taller al primer intento podrá saltarse los videos del módulo (ver [interactivos.md](./interactivos.md)).

Para grabar: [plan-grabacion.md](./plan-grabacion.md).

### Las preguntas dentro de la lección

No dan nota. El docente toca una opción y lee por qué. Puede tocar otra después. La nota la pone el taller.

En el texto de la lección se escriben así (el bloque ya está programado en la app):

```text
:::pregunta Andrés escribe «Hazme un taller de argumentación para bachillerato». ¿Qué le llega?
- [ ] Un taller listo para su 2.º.
  Gemini no sabe qué ya vieron ni en qué se equivocan. Andrés no se lo dijo.
- [x] Definiciones y preguntas que sirven para cualquier curso.
  Lo que no le dijo, el modelo lo decidió por él.
:::
```

`[x]` marca la mejor opción. Las líneas con sangría debajo de cada opción son el comentario que aparece al tocarla.

## Los módulos

| # | Módulo | Lo que aprende a hacer en Gemini | Lo que deja en Mi unidad |
|---|---|---|---|
| 1 | [Tu primera hoja con Gemini](./modulo-1.md) | Entrar, armar el pedido, revisar, corregir en el mismo chat, exportar a Documentos | Una hoja de su próxima clase, en dos versiones |
| 2 | [Que use tu libro](./modulo-2.md) | Subir la página del libro y pedir que use solo eso; pedirle que pregunte antes de proponer | Una hoja hecha con una página de su libro |
| 3 | [Empezar por la destreza](./modulo-3.md) | Pedir la evidencia antes que la clase, desde el texto de la destreza; revisar minutos y qué hacen los estudiantes | Una clase que termina con algo que él puede revisar |
| 4 | Tu unidad entera | Subir la unidad a Gemini Notebook, pedir la guía y abrir cada cita | Una guía anclada a su texto, con un error encontrado y corregido |
| 5 | La tarea que no se resuelve en diez segundos | Probar su tarea en Gemini, rediseñarla y decidir qué parte hacen sin IA | Una tarea suya rediseñada |
| 6 | Cómo vas a calificar | Hacer la rúbrica y corregirla antes de usarla | La rúbrica de esa tarea |
| 7 | Las reglas del aula | Armar las reglas con el curso; un tutor que da pistas y no respuestas | Las reglas o el tutor |
| Cierre | Tu unidad en el aula | — | La unidad aplicada, con una foto o una línea de lo que pasó |

## Qué hay que construir

Todo lo que falta programar, interactivos y talleres, está en [interactivos.md](./interactivos.md). Los videos se pueden grabar sin esperar nada de eso. Mi unidad es la fase 2 de [ruta-unidad.md](../ruta-unidad.md).

## Lo que tomamos de otros repositorios

Revisados el 24 de octubre de 2026.

| Recurso | Estado | Qué tomamos |
|---|---|---|
| [GarethManning/education-agent-skills](https://github.com/GarethManning/education-agent-skills) | Activo. Versión 3.1.0 del 22 de octubre de 2026, 165 instrucciones con su evidencia | Ver abajo |
| [Prompts para docentes de Mollick](https://recursostic.info/programas/bibliotecadeprompts/prompts-docentes.html), en español | CC BY 4.0 | Referencia para los módulos 6 y 7 (rúbricas, tutor) |
| [lerlerchan/Prompt-libraries-for-Malaysia-Educators](https://github.com/lerlerchan/Prompt-libraries-for-Malaysia-Educators) | Activo, julio de 2026, MIT | Modelo de una biblioteca de pedidos atada al currículo de un país. No hay ninguna para Ecuador |
| [dair-ai/Prompt-Engineering-Guide](https://github.com/dair-ai/Prompt-Engineering-Guide) | Activo, marzo de 2026, MIT, en español | Fondo técnico para el equipo, no para los docentes |
| [microsoft/prompts-for-edu](https://github.com/microsoft/prompts-for-edu) | Sin cambios desde abril de 2024 | Nada |

De Manning se tomaron ideas, citando los estudios originales, no su texto. Su contenido es CC BY-SA 4.0: si algún día se copia texto suyo en una lección, esa lección tiene que publicarse con la misma licencia.

Lo que cambió en el diseño:

- **Un error por ejemplo, después de ver la revisión hecha.** Los ejemplos con errores funcionan mejor que los correctos a la semana, no al día siguiente; funcionan con un solo error y pidiendo que expliquen por qué; y confunden a quien no vio antes la versión correcta ([McLaren et al., 2012](https://doi.org/10.1007/978-3-642-33263-0_18); [Große y Renkl, 2007](https://doi.org/10.1016/j.learninstruc.2007.09.008)). Por eso «Revisa tú» y el taller de errores van después del video de revisión, con un error por tarjeta. Por eso también importa la pregunta de la semana siguiente.
- **Cada opción incorrecta de una pregunta es un error concreto.** Así la opción que toca el docente dice qué está pensando (las «preguntas bisagra» de Wiliam, 2011).
- **Comparar dos pedidos es el mecanismo central para enseñar a pedir.** Manning marca la evidencia de enseñar *prompting* como baja a moderada: es un campo nuevo. Lo que sí está probado es que el pedido cambia el resultado. Los videos 1.3 y 1.5 y el 3.3 son esa comparación.
- **El error más difícil de ver es el sutil.** Una institución real con un número inventado, como el 15 % de la Academia Americana de Pediatría. Para revisar una cifra se busca si la fuente existe y si dice eso; no se le pregunta a la IA.

## Decisiones abiertas

- Si Andrés reemplaza a Norma en todo el curso o Norma queda como ejemplo para Básica. Si la reemplaza, cambian [guiones-ruta.md](../guiones-ruta.md), las tarjetas de [grabacion/tramo-1.md](../grabacion/tramo-1.md) y los ejemplos del catálogo actual.
- Cuánto dura la hora de clase en los colegios fiscales. El pedido de Andrés dice 40 minutos, sin confirmar.
- Antes de publicar:
  - Validar el juez contra la nota de docentes expertos.
  - Conseguir que el certificado valga para ascenso (por ejemplo, alojándolo en Me Capacito, como hace VVOB).
