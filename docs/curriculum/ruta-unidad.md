# Ruta: tu próxima unidad, de punta a punta

Propuesta para reemplazar los tres cursos por herramienta (prompting, NotebookLM, rúbricas) por una sola ruta ordenada como trabaja un docente. Borrador de octubre 2026. No está cargado en el seed.

## Por qué cambiar

Hoy ILIA se ve como cualquier plataforma de cursos: tres cursos por herramienta, lecciones de texto en fila y un laboratorio al final de cada uno. El docente termina con tres pedidos sueltos y un certificado.

Lo que ninguna otra plataforma hace es medir el pedido que escribe el docente. La ruta aprovecha eso: cada tramo termina en una pieza de **su** unidad, y al final tiene la unidad completa, revisada y guardada.

## Cómo se recorre

1. Al entrar, el docente dice su materia, su grado y la unidad que va a dar.
2. Cada tramo abre con una **decisión**, no con teoría: un caso de zona gris («¿esto es legítimo o es trampa?»). Responde antes de leer.
3. Después viene la lección: primero qué ocurre, luego la estructura que se reutiliza, al final el caso de Norma.
4. El tramo cierra en el laboratorio. Lo que aprueba se guarda en **Mi unidad**.
5. El certificado muestra esa unidad, no las horas.

El caso que se sigue sigue siendo Norma (lengua, 7.º EGB, LL.3.3.3). Para bachillerato hace falta un segundo caso con su ficha llena. Hasta entonces, **no hallado**: no se escribe un código de destreza de BGU sin abrir el tomo.

## Los siete tramos

| # | Tramo | Idea de fondo | El docente deja en Mi unidad | Origen |
|---|---|---|---|---|
| 1 | Qué no se le entrega a la IA | Automaticidad y carga cognitiva | Qué parte de su unidad se hace sin IA, y por qué | Nuevo (documento maestro, módulo 1) |
| 2 | Empezar por la evidencia | Diseño inverso, Bloom revisada | Meta, evidencia y clases de la unidad | Nuevo (módulo 2) |
| 3 | La hoja de la clase | Las cinco piezas, el recuadro, la entrevista previa | El pedido de su próxima clase | Curso de prompting + módulo 1 |
| 4 | Desde tu propio material | Trabajar solo con tus fuentes | El pedido anclado a su capítulo | Curso de NotebookLM |
| 5 | La tarea que no se resuelve en diez segundos | Tarea en dos partes, entregas por pasos | Una tarea suya rediseñada | Nuevo (módulos 3 y 4) |
| 6 | Cómo vas a calificar | Rúbrica observable; el modelo puntúa, tú certificas | Una rúbrica de esa tarea | Curso de evaluación + módulo 4 |
| 7 | Las reglas del aula | Colaborar o delegar; tutor que no regala la respuesta | Las tarjetas del debate o el tutor | Nuevo (módulo 5) |

El orden importa: la tarea del tramo 5 sale de la evidencia del tramo 2, y la rúbrica del tramo 6 califica esa tarea. Un laboratorio puede mostrar lo que el docente ya guardó en el tramo anterior.

## Tramo por tramo

### 1. Qué no se le entrega a la IA

- **Decisión inicial.** Los tres casos del sondeo: el borrador pulido con la rúbrica, el esquema que arma la IA, el docente que califica 40 ensayos con un modelo.
- **Lección.** Un estudiante que todavía no automatizó un procedimiento gasta la cabeza en recordarlo y no le queda para pensar. Si la máquina lo hace por él antes de tiempo, no lo aprende nunca. Si ya lo sabía y deja de practicarlo, lo pierde. El caso de los gastroenterólogos sirve para mostrar que esto le pasa también a un experto.
- **El rol, sin disfraz.** Aquí se dice qué rol sirve: el del aula («docente de ciencias de 1.º de Bachillerato»), no el personaje («eres Sócrates»). Así el tramo no contradice la comprobación de rol del laboratorio.
- **Laboratorio.** Un pedido sobre su unidad que separa lo que el estudiante hace solo de lo que puede hacer con IA, con el texto del tema entre marcas y una entrevista previa: que el modelo pregunte antes de proponer.

### 2. Empezar por la evidencia

- **Decisión inicial.** «Tienes tres semanas para este tema. ¿Qué escribes primero: el temario, la prueba o la primera clase?»
- **Lección.** El diseño de siempre va del temario a la clase y deja la prueba para el final. El diseño inverso empieza por lo que el estudiante tiene que poder hacer solo, después define cómo se va a comprobar, y recién entonces arma las clases. Recordar y comprender se siguen evaluando, en papel y en el aula. El peso de los proyectos sube a analizar y evaluar.
- **Laboratorio.** Un pedido que parte de la meta de su unidad, pide dos evidencias sin IA y una de orden superior, y arma cuatro clases de 45 minutos.

### 3. La hoja de la clase

Lo que ya está escrito: un pedido de una línea, qué ocurre, las cinco piezas, el recuadro, adjuntar tus archivos, la hoja completa, el primer borrador no se fotocopia. Se suma la entrevista previa del módulo 1. El laboratorio actual («El pedido de tu próxima clase») queda igual.

### 4. Desde tu propio material

Lo que ya está escrito en NotebookLM. Se suma un párrafo del módulo 3: abrir la cita antes de creerla. El modelo puede leer mal tu propio PDF, y cargar las fuentes no lo impide. El laboratorio actual queda igual.

### 5. La tarea que no se resuelve en diez segundos

- **Decisión inicial.** Una tarea de casa típica de la materia del docente: «¿Cuánto tarda un estudiante con el celular?»
- **Lección.** Tres salidas que no se excluyen:
  - **Tarea en dos partes.** Primero el estudiante la resuelve solo y explica sus decisiones. Después le pide lo mismo a la IA, compara y escribe qué aceptaría de la máquina y qué no.
  - **Fases protegidas.** El primer borrador se escribe en clase, a mano. La IA entra en la revisión, y el estudiante anota qué críticas aceptó.
  - **Entregas por pasos.** Un trabajo grande partido en cuatro entregas cortas revisadas en la semana. Baja el bloqueo de última hora, que es cuando más se copia. Con la versión adaptada (oraciones cortas, casillas, primer paso resuelto) sirve también para estudiantes con necesidades educativas especiales.
- **Laboratorio.** Un pedido que toma una tarea suya del año pasado y la devuelve en dos partes, con el pedido que usará el estudiante y tres preguntas para revisar lo que hizo la IA.

### 6. Cómo vas a calificar

Lo que ya está escrito en evaluación. El laboratorio pasa a calificar la tarea del tramo 5, no una tarea cualquiera. Se suma una regla del módulo 4: la rúbrica explica al estudiante, al inicio, por qué la tarea protege lo que tiene que aprender.

### 7. Las reglas del aula

- **Decisión inicial.** «El primer día, ¿pones tú las reglas de IA o las arman con el curso?»
- **Lección.** Las reglas que el curso discute se cumplen mejor que las que llegan impuestas. Seis tarjetas con casos de su materia, grupos de cuatro, y en la pizarra tres columnas: permitido, permitido con condiciones, prohibido. Después, el tutor que guía sin dar la respuesta: mensajes cortos, una pregunta al final, y si el estudiante pide la solución, una pista en su lugar. Va con una advertencia para el aula: el modelo no es un amigo ni una persona.
- **Laboratorio.** A elección: el pedido que genera las seis tarjetas o el tutor con sus reglas.

## En qué se apoya

Cada tramo nombra **una** idea y su fuente, en una línea al pie de la lección. No se pegan porcentajes en el texto del docente.

| Tramo | Fuente | Estado |
|---|---|---|
| 1 | LaBerge y Samuels (1974), automaticidad en la lectura, *Cognitive Psychology* | Publicado |
| 1 | Sweller (1988), carga cognitiva, *Cognitive Science* | Publicado |
| 1 | Budzyń et al. (2025), endoscopistas después de usar IA, *The Lancet Gastroenterology & Hepatology* | Publicado |
| 1, 7 | Bastani et al. (2025), «Generative AI without guardrails can harm learning», *PNAS* (Wharton, matemática de colegio) | Publicado |
| 1 | Kosmyna et al. (2025), «Your Brain on ChatGPT», MIT Media Lab | Preprint, muestra chica: citar como preprint |
| 2 | Wiggins y McTighe, *Understanding by Design* (ASCD, 1998; 2.ª ed. 2005) | Publicado |
| 2 | Anderson y Krathwohl (2001), taxonomía de Bloom revisada | Publicado |
| 2 | Roediger y Karpicke (2006), práctica de recuperación, *Psychological Science* (las pruebas cortas en papel) | Publicado |
| 2, 5 | MIT Teaching + Learning Lab: charla de IA generativa en la docencia (Lourdes Alemán, Per Urlaub) | Pegar enlace y minuto |
| 5 | Wood, Bruner y Ross (1976), andamiaje, *Journal of Child Psychology and Psychiatry* | Publicado |
| 5, 6 | Mazur (1997), *Peer Instruction*, Harvard | Publicado |
| 7 | Laura Roberts (WPI), política de IA acordada con el curso | Pegar enlace de la charla |
| 3 | Guías ya citadas en [ruta-docentes.md](./ruta-docentes.md): OpenAI Academy, Anthropic, LearnLM, DfE | Ya en el repo |

## Qué hay que construir

La base ya permite un laboratorio por tramo: cada actividad cuelga de un módulo y tiene su propia rúbrica. El juez arma lo que pide a partir de esa rúbrica, así que los criterios propios de cada tramo son datos, no código nuevo.

| Fase | Qué | Cambio |
|---|---|---|
| 1 | Los siete tramos con sus lecciones, un laboratorio y una rúbrica por tramo | Contenido y seed. Sin tablas nuevas |
| 2 | Mi unidad: la mejor entrega aprobada de cada tramo, con el pedido y la hoja que devolvió el modelo | Endpoint de lectura sobre las entregas que ya se guardan, más una pantalla |
| 3 | Materia, grado y unidad del docente al entrar, y su uso en los enunciados | Migración y formulario |
| 3 | La decisión inicial de cada tramo, con el voto de la cohorte | Tabla de votos y una tarjeta en la lección |
| 4 | El certificado muestra la unidad | Cambio en certificados |

La fase 1 ya cambia lo que se vive: siete laboratorios encadenados en lugar de tres sueltos. Las fases 2 y 3 son las que hacen que la ruta deje de parecer un catálogo.

## Decisiones abiertas

- Si la ruta reemplaza los tres slugs actuales o se publica al lado mientras se prueba con la cohorte de Manta.
- El segundo caso, de bachillerato: materia, grado y destreza, con la ficha llena.
- Si el tramo 7 certifica con cualquiera de los dos laboratorios o pide los dos.
