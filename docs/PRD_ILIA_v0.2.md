# PRD — ILIA
### Plataforma multiplataforma (iOS · Android · Web) de formación y certificación en IA con evaluación por prompts

| | |
|---|---|
| **Versión** | 0.2 — alineado al código en `main` |
| **Fecha** | 7 de septiembre de 2026 *(v0.1)* · actualizado 21 de septiembre de 2026 |
| **Producto** | **ILIA** *(antes `PRAXIS.AI` en el mockup y en el PRD v0.1)* |
| **Promotor** | Instituto de Inteligencia Artificial (emprendimiento del equipo) |
| **Aliado institucional** | Dirección de Educación Complementaria, Alcaldía de Manta |
| **Estado** | MVP vertical en código; este documento registra producto y cortes de alcance |

---

## 0. Sobre este documento

Está construido a partir de tres fuentes:

1. La transcripción de la reunión del 7-sep-2026 (Luis Figueroa, Miquel Less, Eduardo Calvache).
2. El mockup `Plataforma_educativa_IA.html` (16 pantallas, todas del rol estudiante).
3. Las definiciones verbales del equipo sobre roles y stack.

**Convención:** lo que aparece marcado como **[A confirmar]** es una propuesta mía derivada del contexto, no una decisión que ustedes hayan tomado. Todo lo demás sale directamente de las fuentes anteriores. No inventé métricas, plazos ni compromisos que no estuvieran en la reunión.

**Archivo:** este documento se llamaba `docs/PRD_PRAXIS_AI_v0.1.md`. El nombre del producto en producción es **ILIA**.

---

## 1. Resumen ejecutivo

ILIA es una plataforma de cursos de inteligencia artificial —app nativa para iOS y Android más versión web, desde una misma base de código— cuyo diferenciador es que **no evalúa con exámenes de opción múltiple, sino midiendo la calidad de los prompts que el estudiante escribe y de los resultados que obtiene**. Un motor de evaluación (EVALs) puntúa cada entrega y esa puntuación es la que sustenta la certificación.

El primer segmento es **docentes de Manta**. En la reunión del 7-sep se acordó una alianza con la Dirección de Educación Complementaria de la Alcaldía: las charlas presenciales (dictadas por pasantes) enganchan al docente, y la plataforma actúa como el recurso de formación continua y certificación posterior. El modelo comercial es freemium, con rutas de aprendizaje de nivel básico a experto, y con expansión posterior a emprendedores (programa Manta Capacita).

---

## 2. Contexto y origen

### 2.1 El acuerdo alcanzado

En la reunión se cerró una **alianza estratégica de formación en IA**: la plataforma del Instituto se establece como el recurso de formación continua y certificación para docentes, actuando como complemento obligatorio tras las charlas presenciales de capacitación gestionadas por la dirección de educación municipal.

### 2.2 Lo que ya funciona (aprendizaje del aliado)

Eduardo Calvache describió una metodología presencial que **ya demostró funcionar** con docentes:

- Se centra en ingeniería de prompts y en herramientas como Google NotebookLM.
- Ataca tareas rutinarias del docente: creación de diapositivas, resúmenes, material de clase.
- El enganche viene de **demostrar ahorro de tiempo inmediato**, no de teoría. La resistencia inicial (por desconocimiento) se rompe en la primera demostración útil.

Esto es la restricción de diseño más importante del producto: **el primer contacto del docente con la plataforma tiene que devolverle valor en minutos, no en semanas.**

### 2.3 Restricciones del entorno real

- Las capacitaciones docentes ocurren en el **"horario extendido"** de los colegios, aproximadamente **14:00–16:00**. Es un horario que los docentes perciben negativamente por fatiga.
- La cobertura amplia depende de **pasantes** de la Alcaldía, no del equipo (que tiene disponibilidad limitada por ser estudiantes). Eduardo confirmará en un plazo máximo de 2 semanas si la municipalidad asigna a los pasantes del semestre anterior.
- Existe una **Cumbre de Docentes en noviembre** con más de 2.000 educadores en el nuevo auditorio de la ULEAM. Eduardo la mencionó como posible escaparate si el proyecto demuestra valor. *No es un compromiso cerrado, es una oportunidad condicionada.*

---

## 3. Problema

| Actor | Problema |
|---|---|
| **Docente** | Sabe que la IA existe pero no sabe usarla; la capacitación tradicional le consume su tiempo más escaso (horario extendido) y no le devuelve nada aplicable al día siguiente. |
| **Dirección de Educación** | Puede dictar charlas presenciales, pero no tiene forma de dar continuidad, medir aprendizaje real ni certificar. La cobertura depende de personas. |
| **Mercado de cursos de IA** | Certifican por asistencia o por tests teóricos. Nadie verifica si la persona **sabe realmente prompteear**. |

---

## 4. Propuesta de valor

> Aprendes IA haciendo prompts reales, y tu certificado se gana con una puntuación objetiva sobre la calidad de esos prompts y sus resultados.

Tres pilares:

1. **Práctico antes que conceptual.** Cada módulo termina en una actividad ejecutable, no en un cuestionario.
2. **Evaluación verificable.** EVALs en backend miden calidad de prompt + calidad del resultado.
3. **Continuidad institucional.** La plataforma es el paso 2 obligatorio después de la charla presencial.

---

## 5. Usuarios y roles

Se definen **tres roles**. Los permisos son acumulativos hacia arriba salvo donde se indique.

### 5.1 Estudiante (docente, y más adelante emprendedor)

- Se registra e inicia sesión.
- Explora el catálogo y se inscribe en cursos.
- Consume lecciones (vídeo, presentaciones, texto).
- Resuelve actividades escribiendo prompts en el **Laboratorio IA**.
- Recibe puntuación y feedback de cada entrega.
- Participa en foros por módulo.
- Entrega proyecto final.
- Obtiene certificado como **código verificable** (verificación pública; sin PDF en Fase 1).
- Ve su progreso y ritmo de estudio.

### 5.2 Docente / instructor de la plataforma

> Ojo: aquí "Docente" es el rol de quien **dicta** en la plataforma. El docente de colegio que se capacita es un **Estudiante**. Conviene renombrar el rol a **Instructor** para evitar confusión permanente en el equipo. **[A confirmar]**

- Todo lo del estudiante, más:
- Crea y edita cursos, módulos y lecciones.
- Sube contenido (vídeo, presentaciones, documentos).
- Define actividades y sus rúbricas de evaluación.
- Revisa entregas, ve la puntuación automática y **puede ajustarla manualmente** con justificación.
- Deja feedback escrito al estudiante (el mockup ya contempla "Feedback del instructor").
- Modera los foros de sus cursos.
- Ve las métricas de sus propios cursos e inscritos.

### 5.3 Administrador

- Todo lo del instructor, más:
- Visión global: cuántos instructores hay, qué cursos existen, qué materias, quiénes están inscritos en cada curso.
- Alta, baja y cambio de rol de usuarios.
- Publica o retira cursos del catálogo.
- Configura planes freemium y límites de uso.
- Emite y revoca certificados.
- Ve consumo de LLM y costos.
- Gestiona rúbricas globales.

### 5.4 Matriz de permisos (resumen)

| Capacidad | Estudiante | Instructor | Admin |
|---|:--:|:--:|:--:|
| Inscribirse y tomar cursos | ✅ | ✅ | ✅ |
| Enviar prompts a evaluación | ✅ | ✅ | ✅ |
| Crear/editar cursos | ❌ | ✅ (propios) | ✅ (todos) |
| Subir contenido | ❌ | ✅ (propios) | ✅ |
| Ajustar puntuación manual | ❌ | ✅ (propios) | ✅ |
| Ver todos los inscritos | ❌ | ✅ (propios) | ✅ |
| Gestionar usuarios y roles | ❌ | ❌ | ✅ |
| Emitir/revocar certificados | ❌ | ❌ | ✅ |
| Ver costos de LLM | ❌ | ❌ | ✅ |

---

## 6. Decisión de plataforma

El producto es **multiplataforma: iOS, Android y web**, construido con React Native y React Native Web sobre una misma base de código.

Esto resuelve la fricción principal que tenía el diseño: **cada rol usa el dispositivo que le corresponde.**

| Rol | Dispositivo esperado | Razón |
|---|---|---|
| Estudiante (docente) | Móvil, principalmente | Consume lecciones y escribe prompts en huecos de tiempo; el móvil es lo que tiene a mano en el colegio |
| Instructor | Web, principalmente | Subir vídeo, ordenar módulos, redactar rúbricas y corregir entregas son tareas de escritorio |
| Administrador | Web | Los listados de usuarios, cursos, inscritos y costos son tabulares por naturaleza |

Ningún rol queda **bloqueado** en una plataforma: el estudiante también puede estudiar en web, y el instructor puede consultar entregas desde el móvil. Lo que se decide aquí es **para qué plataforma se diseña primero cada pantalla**.

### La contrapartida, dicha con claridad

Compartir código entre móvil y web funciona muy bien en la lógica (dominio, datos, casos de uso, estado) y bastante peor en la presentación. Un panel de administración con tablas densas no se resuelve con componentes pensados para una pantalla de teléfono.

En la práctica esto significa que **habrá pantallas que se escriban dos veces**, sobre todo las de instructor y admin. Es un costo asumible y sigue siendo mejor que mantener dos proyectos separados, pero conviene planificarlo desde ahora en vez de descubrirlo a mitad del desarrollo.

**Pregunta abierta:** ¿la creación de cursos estará disponible también en la app móvil, o será exclusivamente web? Recomiendo que sea solo web en el MVP, para no gastar esfuerzo en una pantalla difícil que casi nadie usará desde el teléfono. **[A confirmar]**

---

## 7. Alcance del MVP

### 7.1 Dentro del MVP

**Cuenta y acceso**
- Registro, login, recuperación de contraseña.
- Perfil de usuario.

**Catálogo y cursos**
- Explorar cursos, ver detalle (descripción, temario, instructor).
- Inscripción.
- "Mis cursos" con progreso.

**Aprendizaje**
- Estructura curso → módulo → lección.
- Tipos de lección: vídeo, presentación, texto, comprobación rápida.
- Marcado de lección completada y porcentaje de avance.

**Laboratorio IA y evaluación (núcleo del producto)**
- Enunciado de actividad.
- Editor donde el estudiante escribe su prompt.
- Ejecución del prompt contra el modelo.
- Pantalla de resultado con: salida generada, puntuación por dimensión, feedback y recomendación de mejora.
- Reintentos limitados. **[A confirmar: cuántos]**

**Foro**
- Hilos por módulo, respuestas.

**Certificados**
- Emisión al cumplir criterios y **verificación pública por código**. Fase 1: **no hay PDF descargable** ni copia «oficial» ante terceros — alineado a `apps/api/app/features/certificates/interface/router.py` y `docs/pilot-charla.md`.

**Freemium**
- Ruta básica gratuita con cupo limitado de evaluaciones; contenido avanzado y certificación de pago. **[A confirmar los límites exactos]**

**Gestión (web, ver §6)**
- Creación de cursos, carga de contenido, revisión de entregas, panel de administración.

### 7.2 Fuera del MVP

- Cursos para emprendedores (fase 2, mencionado en la reunión vía Manta Capacita).
- Asesorías pagadas 1 a 1.
- Integración con sistemas de la Alcaldía.
- App de escritorio o web pública completa.
- Gamificación, rankings, insignias.
- Modo offline completo.
- Multi-idioma.

---

## 8. Historias de usuario principales

### Estudiante

| ID | Historia | Criterio de aceptación |
|---|---|---|
| E-01 | Como docente quiero registrarme con mi correo para acceder a los cursos. | Registro validado, sesión persistente en el dispositivo. |
| E-02 | Como docente quiero ver qué cursos hay y de qué tratan antes de comprometerme. | Catálogo con descripción, nivel, duración y temario visible sin inscripción. |
| E-03 | Como docente quiero inscribirme y que el curso aparezca en mi panel. | Tras confirmar, el curso está en "Mis cursos" y es retomable. |
| E-04 | Como docente quiero retomar exactamente donde me quedé. | La app abre en la última lección no completada. |
| E-05 | Como docente quiero escribir un prompt y saber si está bien hecho. | Recibo puntuación por dimensiones + feedback accionable en la misma sesión. |
| E-06 | Como docente quiero entender por qué me puntuaron así. | El resultado desglosa cada dimensión con una razón, no solo un número. |
| E-07 | Como docente quiero preguntar dudas a otros participantes. | Puedo abrir un hilo y responder en el foro del módulo. |
| E-08 | Como docente quiero **acreditar** que completé el curso. | Tras cumplir criterios, recibo un **código**; cualquiera lo comprueba en verificación pública **sin cuenta**. No hay PDF en Fase 1. |

### Instructor

| ID | Historia | Criterio de aceptación |
|---|---|---|
| I-01 | Como instructor quiero crear un curso con módulos y lecciones. | Curso en borrador, publicable. |
| I-02 | Como instructor quiero definir una actividad de prompt con su rúbrica. | La actividad queda ligada a una rúbrica con dimensiones y pesos. |
| I-03 | Como instructor quiero revisar entregas y corregir la nota si el motor se equivocó. | Puedo sobrescribir la puntuación dejando justificación; queda registrado quién y cuándo. |
| I-04 | Como instructor quiero ver quiénes están inscritos y cómo van. | Listado con progreso y última actividad. |

### Administrador

| ID | Historia | Criterio de aceptación |
|---|---|---|
| A-01 | Como admin quiero ver el estado global de la plataforma. | Total de instructores, cursos, materias, inscritos por curso. |
| A-02 | Como admin quiero cambiar el rol de un usuario. | Cambio inmediato y auditado. |
| A-03 | Como admin quiero controlar el gasto en modelos. | Consumo por usuario, curso y período; alertas por umbral. |
| A-04 | Como admin quiero emitir o revocar certificados. | Acción auditada, el certificado revocado falla la verificación pública. |

---

## 9. El motor de evaluación por prompts (EVALs)

Este es el corazón del producto y merece definición explícita.

### 9.1 Cómo funciona el flujo

1. El estudiante lee el **enunciado** de la actividad (ej.: "consigue que el modelo genere una serie coherente de tres imágenes con el mismo personaje").
2. Escribe su **prompt** en el Laboratorio IA.
3. La plataforma **ejecuta** ese prompt contra el modelo y guarda la salida.
4. El motor de EVALs puntúa **dos cosas distintas**:
   - **Calidad del prompt** (¿está bien construido?).
   - **Calidad del resultado** (¿logró el objetivo del enunciado?).
5. Se devuelve puntaje por dimensión + feedback + sugerencia concreta de mejora.

### 9.2 Dimensiones propuestas de la rúbrica **[A confirmar con el equipo pedagógico]**

| Dimensión | Qué mide | Peso sugerido |
|---|---|---|
| Claridad y especificidad | ¿La instrucción es inequívoca? | 20% |
| Contexto y rol | ¿Aporta contexto, audiencia, rol del modelo? | 15% |
| Restricciones y formato | ¿Define formato, longitud, tono, límites? | 15% |
| Adecuación a la tarea | ¿El prompt ataca realmente lo que pide el enunciado? | 20% |
| Calidad del resultado | ¿La salida cumple el objetivo? | 30% |

El mockup ya muestra dos dimensiones ("Calidad del prompt", "Coherencia y composición"), así que la rúbrica es **configurable por actividad**, no fija.

### 9.3 Advertencias honestas sobre esta pieza

Quiero ser explícito porque afecta a la credibilidad de la certificación:

- **Un LLM evaluando prompts (LLM-as-judge) es una técnica conocida pero no perfectamente confiable.** Tiende a sesgos de longitud, de formato y de autoconfirmación. Es imprescindible **calibrar la rúbrica contra una muestra corregida a mano** antes de certificar a nadie. No tengo una estadística verificada que darles sobre el margen de error típico; hay que medirlo con sus propios datos.
- **Hay que evitar que el estudiante haga trampa** pidiéndole al modelo la respuesta directamente en vez de resolver la tarea. Mitigación: puntuar prompt y resultado por separado, y usar enunciados donde el objetivo sea el proceso.
- **Riesgo de inyección de prompt contra el evaluador**: el texto del estudiante no puede tratarse nunca como instrucción para el juez. Se detalla la mitigación en el TRD.
- **Debe existir siempre la posibilidad de revisión humana** (historia I-03). Sin eso, la certificación es difícil de defender ante la Alcaldía.

---

## 10. Certificación

- Criterios de emisión propuestos: completar el 100% de lecciones obligatorias + superar el umbral de puntuación en las actividades evaluadas + entregar proyecto final. **[A confirmar el umbral]**
- **Fase 1 (corte enviado):** el certificado es un **código antifalsificación** + página de **verificación pública** (`GET /api/v1/certificates/verify/{code}`). No hay endpoint de descarga ni generación de PDF en el backend. La app no promete «oficial» ni «descarga» en copy de certificados (`apps/mobile/src/features/certificates/domain/copy.ts`).

**Decisión de producto pendiente (no bloquea el piloto):** ¿en una fase posterior hace falta **PDF descargable** (diseño, almacenamiento, cola)? Hoy el valor demostrable es la verificación sin cuenta.

**Pregunta abierta con la Alcaldía:** en la reunión se habló de **"certificaciones oficiales"**. Hay que aclarar con Eduardo qué significa "oficial" en el acuerdo — **la plataforma no usa esa palabra en la UI** hasta tener respuesta. No confundir con un PDF bonito.

---

## 11. Modelo de negocio

- **Freemium**, con rutas de aprendizaje de nivel básico a experto.
- La lógica confirmada por Eduardo: hay que **demostrar valor inmediato** para superar la resistencia inicial y recién ahí generar interés en cursos completos o asesorías pagadas.
- El costo de los tokens de LLM lo asume la plataforma (decisión del equipo), lo que hace que **el cupo de evaluaciones sea la palanca principal del tier gratuito**.

Propuesta de estructura **[A confirmar]**:

| | Gratis | Pago |
|---|---|---|
| Ruta básica | ✅ | ✅ |
| Rutas intermedia/experto | ❌ | ✅ |
| Evaluaciones de prompt | Cupo mensual limitado | Amplio |
| Certificado (código + verificación pública) | ❌ | ✅ |
| Foros | ✅ lectura | ✅ participación |

---

## 12. Métricas de éxito

Ninguna de estas cifras salió de la reunión; son objetivos propuestos para que los ajusten. **[A confirmar]**

| Métrica | Por qué importa |
|---|---|
| % de docentes que, tras la charla presencial, activan cuenta en la plataforma | Mide si la alianza realmente convierte |
| % que completa la primera actividad evaluada | Mide el "valor en minutos" del §2.2 |
| Tasa de finalización de la ruta básica | Salud del contenido |
| Puntuación media y su evolución entre intento 1 y N | Mide aprendizaje real, que es la promesa del producto |
| Costo de LLM por estudiante activo | Viabilidad del freemium |
| Conversión gratis → pago | Viabilidad del negocio |

---

## 13. Hitos

Solo dos fechas salen de la reunión; el resto es propuesta.

| Hito | Fecha | Fuente |
|---|---|---|
| Confirmación de disponibilidad de pasantes | ≤ 2 semanas | Compromiso de Eduardo Calvache |
| Reunión de seguimiento (revisar avance del software y definir cronograma conjunto) | ~2 semanas | Acuerdo de la reunión |
| Contenido del curso para docentes en construcción | Durante esas 2 semanas | Compromiso del equipo |
| Cumbre de Docentes (>2.000 educadores, auditorio ULEAM) | Noviembre 2026 | Mencionada como oportunidad, **no comprometida** |
| MVP funcional para piloto | **[A confirmar]** | Propuesta |

---

## 14. Riesgos

| # | Riesgo | Impacto | Mitigación propuesta |
|---|---|---|---|
| R1 | Los pasantes no son asignados por la municipalidad | Alto — se cae la cobertura presencial | Plan B: sesiones del propio equipo con menor cobertura; confirmar en 2 semanas |
| R2 | Fatiga docente en horario extendido | Alto — abandono | Micro-lecciones cortas; primera actividad con ahorro de tiempo evidente |
| R3 | El evaluador automático puntúa mal y se pierde credibilidad | Alto | Calibración con muestra humana + override del instructor |
| R4 | Costo de tokens crece más rápido que los ingresos | Medio-alto | Cupos, límite de tokens por entrega, monitoreo de consumo desde el día 1 |
| R5 | Duplicación de esfuerzo al mantener la capa de presentación en móvil y web | Medio | Compartir dominio, datos y casos de uso al 100%; aceptar pantallas separadas donde convenga (§6) |
| R6 | Ambigüedad sobre qué significa certificación "oficial" | Medio | No prometer «oficial» en la app; aclarar con la Alcaldía. Fase 1 = código verificable, no PDF |
| R7 | El equipo son estudiantes con disponibilidad limitada | Medio | Roles definidos y alcance de MVP recortado |
| R8 | Datos personales de docentes | Medio | Ver TRD §11 |

---

## 15. Preguntas abiertas

1. ¿La creación de cursos estará disponible también en móvil, o solo en web? (§6)
2. ¿Qué significa exactamente "certificación oficial" en el acuerdo con la Alcaldía? *(La UI no dice «oficial»; Fase 1 no incluye PDF.)*
3. ¿Cuántos reintentos por actividad y con qué efecto sobre la nota?
4. ¿Cuál es el cupo del tier gratuito y el precio del tier pago?
5. ¿El curso inicial para docentes replica la metodología ya validada de Eduardo (prompting + NotebookLM aplicado a tareas docentes)? Sería lo lógico, pero no está decidido.
6. ¿Quién produce el contenido audiovisual y con qué calendario?
7. ~~¿Habrá cohortes ligadas a una charla presencial concreta?~~ ✅ **Sí.** Admin crea la cohorte; el docente opcionalmente envía `cohort_code` al inscribirse. Ver TRD §7 y `apps/api/app/features/admin/interface/router.py`.
8. ¿El foro es por curso, por módulo o por cohorte? El mockup sugiere por módulo.
