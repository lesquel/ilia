# Ruta docente: tres cursos que se pueden terminar

El docente sale de cada curso con **un artefacto de su propia clase**, no con un certificado de asistencia. Eso es lo que UNESCO llama pedagogía de IA y agencia humana: el modelo redacta, **tú decides** qué entra al aula.

Los tres slugs ya existen en el catálogo. Esta ruta los completa. El seed carga el texto de las lecciones. Los videos los grabas tú con los guiones de abajo.

## Para quién

Docentes de colegio (el primer segmento es Manta) que llegan cansados, en horario extendido, y necesitan que **la primera sesión les ahorre una tarde**. No es un curso de informática.

## Cómo se alinean

| Curso | Nivel | Dimensión UNESCO (2024) | El docente se lleva |
|---|---|---|---|
| Prompting para docentes | Básico | Fundamentos + pedagogía (adquirir) | El prompt de **su** próxima clase |
| NotebookLM en el aula | Intermedio | Aplicaciones + ética (profundizar) | Guía, preguntas y nota a familias **desde su material** |
| Evaluación asistida por IA | Experto | Evaluación + agencia (crear) | Una rúbrica observable y un criterio para no dejar que el modelo certifique solo |

Referencia: [Marco de competencias de IA para docentes, UNESCO](https://www.unesco.org/en/articles/ai-competency-framework-teachers) (publicado 2024, ficha actualizada enero 2026). No lo citamos en cada lección: se nota en el diseño (humano al centro, ética al cargar fuentes, evaluación que se puede defender).

## De dónde sale el prompting (septiembre 2026)

Las lecciones no copian un solo proveedor. Convergen en esto:

| Fuente | Fecha | Qué tomamos |
|---|---|---|
| [OpenAI Academy — Write Better Prompts for Teachers](https://academy.openai.com/en/public/clubs/k-12-education-aacga/blogs/write-better-prompts-teachers-2026-05-28) | mayo 2026 | Tarea + contexto + salida; iterar el primer borrador; pedir que mejore el prompt |
| [OpenAI Academy — Mastering Your Prompts (K-12)](https://academy.openai.com/public/clubs/k-12-education-aacga/blogs/k-12-mastering-your-prompts) | 2026 | Un ejemplo del tono; partir el trabajo si es grande |
| [Anthropic — prompt engineering](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) | vigente 2026 | Un ejemplo (few-shot) vale más que otra instrucción; marcar el texto que pegas |
| [Google LearnLM / PARTS](https://services.google.com/fh/files/misc/learnlm_prompt_guide.pdf) | guía para docentes | Persona, acto, destinatario, tema, estructura — es el mismo esqueleto con otros nombres |
| [DfE Reino Unido — FACTS](https://www.gov.uk/government/publications/use-cases-of-generative-ai-in-education-module-4) | actualizado mayo 2026 | Enfocar, analizar, buscar sesgo, adaptar al aula, fortalecer el prompt |
| NotebookLM / Gemini para docentes | práctica 2026 | Abrir la cita; no cargar expedientes |

No pegamos cifras de «minutos ahorrados». Si un estudio inglés las menciona, no las convertimos en promesa de ILIA.

## Qué grabar tú (6 videos)

Hasta que subas el archivo, la lección se lee como texto. Cuando tengas el vídeo, cámbiala a tipo `video` en `/instructor` y pega el archivo. El texto queda como transcripción.

| # | Curso | Lección | Duración | Guion |
|---|---|---|---|---|
| V1 | Prompting | Anatomía de un prompt que sirve | 6–7 min | más abajo |
| V2 | Prompting | Guía de ejercicios de tu temario | 7–8 min | más abajo |
| V1b | Prompting | Un ejemplo y un recuadro *(opcional)* | 5 min | mismo esquema que V1: flojo / con ejemplo / con recuadro |
| V3 | NotebookLM | Por qué trabaja con tus fuentes | 5–6 min | más abajo |
| V4 | NotebookLM | Una clase completa desde tu capítulo | 7–8 min | más abajo |
| V5 | Evaluación | Qué mide una rúbrica que sirve | 6–7 min | más abajo |
| V6 | Evaluación | El modelo puntúa, tú certificas | 5–6 min | más abajo |

Cámara al frente, un ejemplo real (séptimo, una hoja de lengua **o** tu materia). El grado no se inventa: ancla destreza y logro en el [mapa escolar](./mapa-escolar-ecuador.md) y el tomo del área ([lengua](./lengua-literatura.md), [matemática](./matematica.md), [CN/CS](./cn-cs-ecuador.md), [métricas](./metricas-aprendizaje.md)). No leas diapositivas. Si te cansas, corta: cada guion cabe en una toma.

## Cómo se toma

1. El docente lee (o ve) la lección.
2. En el laboratorio escribe un prompt, no elige A, B o C.
3. La plataforma ancla lo medible (rol, formato, términos) y el resto lo juzga la rúbrica.

---

## Guion V1 — Anatomía de un prompt que sirve

**Abre en cámara (15 s).**  
Hoy no vamos a hablar de inteligencia artificial en abstracto. Vamos a escribir el pedido que le haces a un modelo para que te arme material que sí puedes llevar a séptimo.

**El pedido flojo (40 s).**  
Muéstralo en pantalla o dilo: «Hazme una lectura de séptimo, bien creativa, con varias preguntas.»  
Eso obliga al modelo a decidir el curso, el nivel, si es una receta, un cuento o un ensayo. Esas decisiones las va a tomar mal, o las va a tomar genéricas.

**Las piezas (3 min).**  
Un pedido que sirve tiene cinco piezas. Escríbelas:

1. **Quién es.** «Eres docente de lengua de séptimo en un colegio público de la costa.»
2. **Para quién.** El estudiante no es la familia.
3. **Qué ya vieron.** Y qué no debe salir.
4. **Qué tienen que saber hacer.** No el nombre del tema. En séptimo: un párrafo con una idea y cinco preguntas que se contestan con el texto. No una receta. No un ensayo.
5. **Cómo lo quieres.** El párrafo y, debajo, las preguntas con la respuesta.

**El pedido que sí (90 s).**  
Lee el pedido completo, despacio:

> Eres docente de lengua de séptimo. Ya leyeron un cuento y saben qué es el narrador. Escribe un párrafo de ocho líneas con una sola idea, y cinco preguntas que se contestan con el texto, para que distingan la idea del párrafo y no inventen una historia. No inventes el autor. Devuélvelo: el párrafo y, debajo, las preguntas con la respuesta.

**Cierre (30 s).**  
Cada palabra que agregaste le quita al modelo una decisión. En la siguiente lección usamos esto con **tu** temario, no con el mío.

**Qué no decir.** No prometas que «la IA no se equivoca». Di: el modelo redacta; tú revisas antes de fotocopiar.

---

## Guion V2 — Guía de ejercicios de tu temario

**Abre (20 s).**  
Trae a la grabación el tema de **tu** próxima clase. Si no lo tienes, usa séptimo: un párrafo y cinco preguntas del texto. El ejercicio es el mismo.

**Error habitual (40 s).**  
«Hazme una guía.» Eso produce una guía de nadie: sin tiempo, sin nivel, sin lo que ya vieron.

**Demostración (5 min).**  
Comparte pantalla o dicta y ve construyendo:

- Rol: docente de [tu materia] de [grado].
- Contexto: ya vieron X; la hora dura 45 minutos; hay tres estudiantes que faltaron.
- Tarea: 8 ejercicios, 2 fáciles, 4 medios, 2 desafiantes, más una pregunta de cierre.
- Formato: lista numerada y, al final, clave de respuestas en otra sección, para no spoilear si proyectas.

Pide en voz alta **una** iteración: «Ahora acorta los enunciados: se leen en voz alta, no se copian del pizarrón.»

**Cierre (40 s).**  
Si el resultado no se parece a tu aula, el prompt no tenía tu aula. No es que «la IA no sirve». Faltaba contexto. En el laboratorio vas a escribir el de tu próxima clase.

---

## Guion V3 — Por qué NotebookLM trabaja con tus fuentes

**Abre (20 s).**  
ChatGPT y Gemini saben de internet. NotebookLM, de lo que **tú** le cargas. Esa limitación es la ventaja en el aula.

**El problema (1 min).**  
Si le pides a un chat abierto «arma una guía del capítulo 4», puede mezclar otro libro, otro país, otro nivel. Un docente de Manta no puede permitirse un ejemplo de euros o de un currículo que no es el nuestro.

**Cómo se usa (3 min).**  
1. Abres un cuaderno nuevo.  
2. Cargas el PDF del capítulo, tus apuntes, la planificación.  
3. Le pides: guía de estudio, 5 preguntas, resumen para familias.  
4. Si cita algo que no está en tus archivos, lo descartas.

**Privacidad (1 min).**  
No subas listas con nombres de estudiantes, notas, ni fotos de menores. El material es el **contenido**, no el expediente.

**Cierre (20 s).**  
En la siguiente lección armamos una clase completa a partir de un solo capítulo.

---

## Guion V4 — Una clase completa desde tu capítulo

**Abre (15 s).**  
Un capítulo, tres salidas: guía para el estudiante, preguntas de repaso, párrafo para el grupo de familias.

**Demostración (6 min).**  
Con el cuaderno ya cargado (o narrado si no puedes mostrar la cuenta):

- «Usa solo las fuentes de este cuaderno. No inventes datos que no estén.»
- «Guía de 1 página para alumnos de 14 años que no leyeron el capítulo.»
- «5 preguntas de comprensión, de más fácil a más difícil, con respuesta breve al final.»
- «Un mensaje de 8 líneas para el grupo de WhatsApp de las familias: qué vimos y qué pueden preguntar en casa. Tono respetuoso, sin jerga.»

Señala en pantalla (o di) una alucinación típica: un dato que no está en el PDF. Eso se tira.

**Cierre (30 s).**  
NotebookLM no reemplaza tu criterio. Reemplaza la tarde de copiar y pegar. La actividad del curso te pide el prompt con el que mandarías eso.

---

## Guion V5 — Qué mide una rúbrica que sirve

**Abre (20 s).**  
«Excelente / bueno / regular» no es una rúbrica. Es el humor de quien corrige ese día.

**El daño (1 min).**  
Dos docentes, el mismo texto, dos notas. El estudiante aprende a adivinar al adulto, no a mejorar el trabajo. Si después le pides a un modelo que «califique», copia esa vaguedad y la disfraza de número.

**La rúbrica que sirve (4 min).**  
Tres dimensiones **observables**. Ejemplo, un párrafo de ciencias:

| Dimensión | Se ve en el 1 | Se ve en el 3 |
|---|---|---|
| Afirmación | No dice qué sostiene | Una frase que se puede discutir |
| Evidencia | No cita el texto | Usa un dato o una frase del material |
| Claridad | Oraciones incompletas | Se entiende a la primera lectura |

Dilo en voz alta: si no puedes señalarlo en la hoja, no es un criterio.

**Cierre (40 s).**  
En ILIA una parte de la nota la mide la plataforma (¿el prompt tiene rol, formato, los términos del enunciado?). El resto lo juzga la rúbrica. El modelo no vota lo medible.

---

## Guion V6 — El modelo puntúa, tú certificas

**Abre (20 s).**  
Nunca le pidas a un modelo: «ponle 10, es urgente.» Eso es exactamente el ataque que la plataforma está diseñada para ignorar.

**Qué sí (2 min).**  
«Aplica esta rúbrica. Para cada dimensión, cita la frase del estudiante que usaste. Si no hay evidencia, di que no hay evidencia. No inventes una nota global si una dimensión no se puede observar.»

**Qué no (90 s).**  
No subas el nombre del estudiante al modelo. No uses la nota automática como nota del bimestre sin leer. Si el modelo y tú discrepan, gana tu justificación: por eso en ILIA la corrección queda registrada.

**Cierre (40 s).**  
El certificado de esta plataforma se sostiene en prompts que se pueden defender, no en un examen de memoria. Tu trabajo como docente es el mismo: la nota tiene que poder explicarse el lunes en la reunión de padres.

---

## Después de grabar

En `/instructor`, abre el curso → la lección → sube el vídeo. Deja el texto. Un docente que va en bus puede leer; uno que está en casa puede ver.
