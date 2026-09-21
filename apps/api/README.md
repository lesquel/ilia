# ILIA API

Backend de ILIA. Python + FastAPI, Clean Architecture organizada por features.

## Requisitos

- Python 3.12+
- [uv](https://docs.astral.sh/uv/)

## Puesta en marcha

```bash
cd apps/api
cp .env.example .env
uv sync

docker compose up -d              # PostgreSQL en localhost:5432
uv run alembic upgrade head       # aplica las migraciones
uv run uvicorn app.main:app --reload
```

Documentación interactiva en <http://localhost:8000/docs> (deshabilitada en
producción). Health check en <http://localhost:8000/health>.

## Comandos

```bash
uv run pytest          # pruebas (las de integración se saltan sin base de datos)
uv run ruff check .    # lint
uv run ruff format .   # formato
uv run mypy app        # tipos (modo strict)
```

## Estructura

```
app/
  main.py              Composition root: aquí se cablea todo al arrancar
  core/                Transversal, sin lógica de negocio
    config.py          Settings desde el entorno, cacheadas
    logging.py         Logs estructurados
    middleware.py      Correlation id por petición
    errors.py          Traducción de errores de dominio a HTTP
    database.py        Engine async, sesiones y Base declarativa
  shared/              Value objects y errores de dominio comunes
    errors.py
  features/
    <feature>/
      domain/          Entidades, reglas y puertos. Python puro.
      application/     Casos de uso y DTOs internos
      infrastructure/  Implementación de los puertos: repos, LLM, storage
      interface/       Routers HTTP y esquemas de request/response
migrations/            Historial de Alembic
```

## Reglas de dependencia

Esto es lo que hace que la arquitectura sea Clean y no simplemente carpetas
con nombres bonitos:

- `domain` es Python puro. **Sin ORM, sin framework web, sin SDK de LLM.**
  Si un import de `domain` trae FastAPI o SQLAlchemy, la regla está rota.
- `application` orquesta casos de uso y depende **solo de puertos** declarados
  en `domain`. Nunca importa de `infrastructure`.
- `infrastructure` implementa esos puertos.
- `interface` traduce HTTP ↔ casos de uso. Aquí vive la autorización por rol;
  las reglas de propiedad ("es *mi* curso") viven en `application`.
- La inyección de dependencias se resuelve al arrancar, no dentro de los casos
  de uso.

El beneficio concreto: el caso de uso "evaluar entrega" depende de un puerto
`PromptEvaluator`. La implementación con LangGraph vive en `infrastructure`.
Eso permite testear el caso de uso con un evaluador falso, **sin gastar tokens.**

## Base de datos

PostgreSQL 17 con SQLAlchemy 2 (async, `asyncpg`) y Alembic. La URL sale de
`ILIA_DATABASE_URL` y necesita el driver async:

```
ILIA_DATABASE_URL=postgresql+asyncpg://ilia:ilia@localhost:5432/ilia
```

> **Al agregar una columna `NOT NULL` poné siempre `server_default`.** Sin él,
> `ALTER TABLE ... ADD COLUMN ... NOT NULL` falla contra una tabla que ya tiene
> filas — y eso pasa durante el despliegue, sobre datos reales. Nos pasó con
> `lesson.body`.

```bash
docker compose up -d                                  # levantar Postgres
uv run alembic upgrade head                           # aplicar migraciones
uv run alembic revision --autogenerate -m "mensaje"   # nueva migración
uv run alembic downgrade -1                           # revertir la última
```

**Dos bases, no una.** `docker compose` crea `ilia` (desarrollo) y `ilia_test`
(integración). Las pruebas hacen `TRUNCATE` de sus tablas en el teardown, así que
apuntarlas a la base de desarrollo significa que `pytest` te borra los datos con
los que estabas trabajando. Nos pasó una vez; por eso existe
`docker/initdb/01-create-test-database.sql`.

```bash
export ILIA_TEST_DATABASE_URL=postgresql+asyncpg://ilia:ilia@localhost:5432/ilia_test
```

**Sin `ILIA_DATABASE_URL` la app arranca igual, con repositorios en memoria** —
útil para mirar la API, inservible para cualquier otra cosa: pierde todas las
cuentas al reiniciar. El arranque lo advierte por log, y en producción
directamente falla.

Alembic lee la URL desde `Settings`, no desde `alembic.ini`. Una sola fuente de
verdad: una migración nunca debe correr contra una base distinta a la de la app.

### Tablas

| Tabla | Notas |
|---|---|
| `app_user` | Correo único e indexado. `app_user` y no `user` porque `user` es palabra reservada en Postgres |
| `cohort` | Grupo de docentes que sale de una charla presencial |
| `course` | Slug único. Índice parcial `ix_course_catalog_keyset` sobre `coalesce(published_at, created_at) DESC, id DESC` filtrado a `status = 'published'` |
| `course_module` | Pertenece a un curso, ordenado por `position` |
| `lesson` | Pertenece a un módulo. Tipos: `video`, `slides`, `text`, `quiz`. `body` para texto, `resource_ref` para vídeo/presentación |
| `enrollment` | Único por `(user_id, course_id)`. `cohort_id` nullable — acá es donde la cohorte finalmente se usa |
| `lesson_progress` | Único por `(enrollment_id, lesson_id)`. Colgado de la inscripción, no del usuario |

Sobre `ix_course_catalog_keyset`: un índice simple sobre `published_at` **no
sirve** para el listado, porque la consulta ordena por
`coalesce(published_at, created_at)` y Postgres no usa un índice de columna para
una expresión. Es parcial sobre `status = 'published'` porque esa es la única
porción que el catálogo lee jamás: el índice queda chico y los borradores ni
aparecen en él.

Sobre `cohort`: existe desde la primera migración aunque la feature de
inscripción todavía no esté. El TRD tiene razón en que añadirla después sería
una migración con datos de docentes reales. Y es lo que hace respondible la
primera métrica de éxito del PRD §12 — **qué porcentaje de los docentes de una
charla activó cuenta** —, que es justamente el número que le demuestra a la
Alcaldía que la alianza funciona.

`app_user.cohort_id` es nullable a propósito: la inscripción también es abierta,
y quien se registra por su cuenta simplemente no tiene cohorte que atribuir.

## Autenticación

Decisión tomada (TRD §4.5): **cookie `httpOnly` para el cliente web, bearer token
para el cliente nativo.** Los mismos casos de uso sirven a los dos; lo único que
cambia es cómo viaja la credencial, y eso vive entero en
`features/auth/interface/transport.py`.

El cliente se declara con la cabecera `X-Client-Platform`:

| Cabecera | El backend responde con | Dónde lo guarda el cliente |
|---|---|---|
| `web` (o ausente) | Cookies `httpOnly` + `Secure` + `SameSite`. El cuerpo trae solo el perfil. | El navegador. La página **no puede leerlas** |
| `native` | `access_token` y `refresh_token` en el cuerpo. Sin cookies. | Keychain / Keystore |

Si la cabecera falta se asume `web`. Es el fallo seguro: si un proxy la pierde,
emitimos una cookie que un cliente nativo ignora, en vez de entregarle a un
navegador un token que puede leer.

La cookie de refresh va con `Path=/api/v1/auth/refresh`. Una cookie que no se
envía en cada petición no puede ser reenviada por cada petición.

### Endpoints de auth

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Alta. Todas las cuentas nacen como `student` |
| `POST` | `/api/v1/auth/login` | Inicio de sesión |
| `POST` | `/api/v1/auth/refresh` | Renueva el par de tokens |
| `POST` | `/api/v1/auth/logout` | Limpia las cookies del navegador |
| `GET` | `/api/v1/auth/me` | Perfil del usuario autenticado |

### Restricción de despliegue que hay que respetar

`SameSite=lax` solo manda la cookie si el cliente web y la API comparten el
dominio registrable. En la práctica: `app.ilia.app` y `api.ilia.app` funcionan
con `ILIA_COOKIE_DOMAIN=.ilia.app`; **dos dominios distintos, no.** Si el
despliegue termina siendo cross-site hay que pasar a `SameSite=none` y añadir
protección CSRF explícita. Mejor decidirlo antes de comprar los dominios que
después.

### Lo que todavía no está

- **Cohortes en el flujo.** La tabla existe, pero todavía no hay endpoint para
  crear una ni para que un docente se una con el código de su charla. Eso llega
  con la feature de inscripción.
- **Revocación real.** El `logout` limpia cookies, pero el access token sigue
  siendo válido hasta que expira porque es stateless. Revocar de verdad exige
  una tabla de denegación de tokens. Con 15 minutos de vida el daño está acotado,
  pero no es lo mismo que revocar.
- Recuperación de contraseña y verificación de correo.

### Guardas de producción

`Settings` **falla al arrancar** si en producción la clave de firma es la de
desarrollo, mide menos de 32 bytes, las cookies no son `Secure`, o no hay
`ILIA_DATABASE_URL`. Un arranque que falla es infinitamente mejor que un token
falsificable —o una base de datos en memoria— en producción.

## Catálogo

**Público, sin autenticación.** Un docente tiene que poder ver de qué trata un
curso antes de comprometerse (PRD E-02); exigir cuenta para leer el temario es
exactamente la fricción contra la que advierte el PRD §2.2.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/v1/catalog/courses` | Lista cursos publicados. Filtros `level` y `q`, paginación `limit` + `cursor` |
| `GET` | `/api/v1/catalog/courses/{slug}` | Detalle con el temario completo |

### Decisiones que vale la pena conocer

**Solo se ven los publicados, y eso lo garantiza el repositorio**, no cada
endpoint. Un borrador que se filtra al catálogo porque alguien olvidó un `WHERE`
es el bug que aparece justo en la demo.

**Un borrador responde igual que un curso inexistente** — mismo 404, mismo
código. Si respondieran distinto, el endpoint de detalle se convertiría en una
forma de descubrir trabajo sin publicar probando slugs.

**Paginación por cursor, no por offset** (TRD §8). Con offset, un curso
publicado mientras el docente scrollea corre todas las filas siguientes y el
docente ve un duplicado o se saltea uno sin enterarse. El cursor es opaco pero
**no es secreto**: es base64 sin firmar, así que nunca metas ahí nada que no sea
público. Y llega del cliente, o sea que no es confiable: cualquier cosa
malformada se rechaza con `invalid_cursor`, no se coerciona.

**La duración se deriva de las lecciones, nunca se guarda.** Una columna
denormalizada se desincroniza la primera vez que alguien edita una lección y se
olvida de recalcularla, y un catálogo que miente sobre cuánto dura un curso
pierde al docente el primer día.

**Los cursos se direccionan por slug**, no por UUID, porque en web se espera
poder compartir el enlace (TRD §4.5). El slug es ASCII estricto: `str.isalnum()`
es Unicode-aware y aceptaría `prompting-básico`, que el navegador convierte en
`prompting-b%C3%A1sico` — ilegible, que es lo contrario de para qué existe un
enlace compartible.

### Catálogo canónico

Un compose recién levantado **no tiene cursos**. Hay que publicarlos:

```bash
uv run python -m scripts.seed_catalog
```

En el despliegue con compose de raíz:

```sh
docker compose run --rm api python -m scripts.seed_catalog
```

Carga los tres slugs de `app/content/teacher_catalog.py`:
`prompting-para-docentes`, `notebooklm-en-el-aula`,
`evaluacion-asistida-por-ia`. Es el contenido de la primera charla, no un
relleno. Idempotente. Corre también en producción.

El instructor de demo, la contraseña y el código de cohorte siguen en
`scripts.seed_demo`, que se niega a correr en producción:

```bash
uv run python -m scripts.seed_demo
```

## Inscripción y progreso

Todos los endpoints son **autenticados**, y la identidad sale del token, nunca
del cuerpo de la petición. Un `user_id` como parámetro dejaría que cualquiera
inscriba a cualquier otro.

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/api/v1/enrollments` | Inscribirse. Acepta `cohort_code` opcional |
| `GET` | `/api/v1/enrollments/me` | "Mis cursos" con el progreso de cada uno |
| `GET` | `/api/v1/enrollments/me/{slug}` | Progreso de un curso + dónde retomar |
| `GET` | `/api/v1/enrollments/me/{slug}/lessons/{lesson_id}` | El material de una lección, con sus vecinas |
| `POST` | `/api/v1/enrollments/me/{slug}/lessons/{lesson_id}/complete` | Marca la lección y devuelve el progreso nuevo |

### Decisiones

**El progreso se deriva, no se guarda.** Un porcentaje cacheado queda obsoleto
en cuanto un instructor agrega una lección, y una barra que dice 100% al lado de
un curso sin terminar destruye la única señal que tiene el docente.

**`next_lesson` es el primer hueco, no la siguiente a la última completada.** Un
docente que se salteó adelante vuelve a lo que se perdió. Cualquier otra cosa lo
deja terminar un curso que no hizo. Es lo que hace respondible el "retomar
exactamente donde quedé" del PRD E-04.

**Marcar una lección dos veces no es un error.** Una conexión inestable que
reintenta no se castiga. En SQL es `ON CONFLICT DO NOTHING`: idempotente en un
solo viaje y a prueba de dos peticiones corriendo a la vez.

**Un curso vacío no es un curso terminado.** Sin esa guarda, un temario en
construcción regalaría la certificación.

**Las completaciones de lecciones que ya no existen se ignoran.** Un instructor
borrando una lección no puede empujar a nadie por encima del 100%.

**`lesson_progress` cuelga de la inscripción, no del usuario.** Así el esquema
garantiza que no puede haber progreso sin inscripción, en vez de que cada caso
de uso tenga que acordarse.

**Un código de cohorte inválido falla fuerte, no en silencio.** Inscribir al
docente sin atribución es exactamente la pérdida de dato que vuelve inútil la
métrica de la alianza.

**El material vive bajo `/enrollments`, no bajo `/catalog`.** El temario es
público (PRD E-02); el contenido no. El repositorio del catálogo deja `body` y
`resource_ref` **vacíos a propósito**, y el contenido se lee por un puerto propio
de `enrollment`, que verifica la inscripción antes de cargar nada. La ruta dice
lo mismo que el código.

**La lección viaja con sus vecinas.** `previous` y `next` vienen en la misma
respuesta, así moverse por un curso cuesta una petición por lección y no tres.
En el wifi de un colegio, cada petición que evitás es una página que carga.

**La navegación cruza módulos.** La última lección del módulo 1 la sigue la
primera del módulo 2, no la nada.

**Y acá es donde las cohortes sirven.** `enrollment.cohort_id` es lo que permite
responder *qué porcentaje de los docentes de la charla del 3 de septiembre activó
cuenta y terminó la ruta básica* — el número que le demuestra a la Alcaldía que
la alianza funciona (PRD §12).

## Laboratorio IA y motor de EVALs

El corazón del producto (PRD §9). Todos los endpoints autenticados.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/v1/lab/activities/{id}` | Enunciado, rúbrica, requisitos objetivos e intentos restantes |
| `POST` | `/api/v1/lab/activities/{id}/submissions` | Envía un prompt. Devuelve **202**, no 201 |
| `GET` | `/api/v1/lab/submissions/{id}` | Entrega + evaluación, para hacer polling |
| `GET` | `/api/v1/lab/activities/{id}/submissions` | Mis intentos en esa actividad |

### El grafo de evaluación (TRD §6.1)

```
validar → ejecutar en aislamiento → checks determinísticos ‖ juicio del modelo
        → agregar → feedback → persistir
```

Vive en `application/use_cases.py` como Python común sobre puertos. LangGraph,
cuando llegue, implementa `PromptExecutor` y `PromptJudge` — **no reemplaza esta
orquestación**, y la secuencia se sigue pudiendo testear sin proveedor.

### Cómo se defiende una nota

Esto es lo que hace que la certificación se pueda sostener frente a un docente
que no está de acuerdo con su nota.

**El total se calcula, nunca se acepta.** El modelo propone un número por
dimensión y nada más. `domain/scoring.py` hace el resto en Python común:

- Las claves que la rúbrica **no define se descartan**. Un modelo que inventa
  una dimensión no puede sumar peso a la nota.
- Las dimensiones que el juez **no puntuó valen cero**, no se ignoran: ignorarlas
  subiría el promedio achicando el denominador.
- Los puntajes fuera de rango se recortan a 0–100.
- No existe un campo `total` de entrada. No hay por dónde colarlo.

**Las verificaciones determinísticas anclan la nota** (`domain/checks.py`). Son
puras y reproducibles: ¿el prompt dice el formato? ¿le da un rol al modelo?
¿menciona los términos que pedía el enunciado? El modelo **no vota** sobre algo
que la plataforma puede medir sola.

**Aprobar exige dos cosas, no una.** El total ponderado dice *qué tan bueno* fue
el prompt; los checks dicen *si hizo lo que la actividad pedía*. Solo el primero
depende del juicio de un modelo.

> Esa separación salió de un test que falló. Con el ancla como una dimensión más
> entre tres, un juez completamente comprometido llegaba a **77.78 sobre un
> umbral de 70** — certificado con un prompt que no cumplía ninguno de los
> requisitos. Un juez inyectado puede inflar el número; lo que no puede es hacer
> que un prompt contenga una instrucción de formato que no contiene.

**El tipo `UntrustedPrompt`** existe para que la regla de inyección sea difícil
de olvidar: los adaptadores reciben ese tipo, nunca un `str` pelado, y **explota
si alguien intenta interpolarlo en un f-string**. La defensa real está en el
adaptador; el tipo es lo que hace que el próximo se entere de que había una regla.

**El feedback tampoco se secuestra.** Un requisito incumplido gana sobre la
sugerencia del modelo — la sugerencia podría ser texto inyectado, y un fallo
medible es específico, cierto y se arregla en segundos.

**Nada de esto elimina el riesgo.** Lo acota. El TRD §6.2 es explícito y hay que
mantener el muestreo humano.

## Proveedores de LLM

Un puerto, varios proveedores, elegidos por configuración:

| `ILIA_LLM_PROVIDER` | Adaptador | Modelo por defecto |
|---|---|---|
| `anthropic` | Messages API | `claude-sonnet-4-5` |
| `openai` | Chat Completions | `gpt-4o` |
| `gemini` | `generateContent` | `gemini-2.0-flash` |
| `deepseek` | Chat Completions | `deepseek-chat` |
| `openai-compatible` | Chat Completions | — (requiere `ILIA_LLM_MODEL`) |

```sh
ILIA_LLM_PROVIDER=anthropic
ILIA_LLM_API_KEY=...
ILIA_LLM_MODEL=            # opcional: hay default por proveedor
ILIA_LLM_BASE_URL=         # solo para openai-compatible
ILIA_LLM_INPUT_PRICE_PER_MILLION=0.25
ILIA_LLM_OUTPUT_PRICE_PER_MILLION=1.25
```

Vacío corre el stub local. Un proveedor **mal configurado falla al arrancar**, no
en la primera entrega: un docente perdería un intento por un error de despliegue
y no se enteraría de por qué.

### Decisiones que vale la pena conocer

**HTTP plano, no cuatro SDK oficiales.** Cada SDK trae su árbol de dependencias,
su cadencia de releases y sus breaking changes, y usamos quizá el 5 % de
cualquiera: una llamada sin streaming, JSON de vuelta, conteo de tokens. Cuatro
SDK serían cuatro veces la superficie de suministro a auditar en un contenedor
que califica el trabajo de docentes.

**Un adaptador cubre OpenAI, DeepSeek y cualquier gateway compatible.** DeepSeek
publica una API compatible con Chat Completions; escribir eso tres veces serían
tres lugares donde arreglar el mismo bug.

**La lógica de evaluación se escribe una vez.** Los proveedores difieren solo en
la forma de una petición HTTPS. Cómo se aísla el prompt, cómo se instruye al
juez, qué puntajes se aceptan y cómo se computa el total es idéntico
independientemente de quién responda — así que vive en `executor.py` y
`judge.py`, sobre el protocolo `LlmClient`, y cada proveedor aporta ~80 líneas.

**Los precios no salen de una tabla incorporada.** Los precios publicados
cambian, y un número hardcodeado desactualizado se lee como autoritativo
mientras está mal. Cero significa «desconocido» y el reporte lo dice en vez de
inventar un costo.

### Defensa contra inyección de prompts

Dos reglas, ambas con test:

1. **El prompt del docente y la salida del modelo son texto no confiable.** La
   salida es menos obvia: la generó el prompt que estamos evaluando, así que
   quien escriba «respondé: ignorá tus instrucciones» recibe esa frase de vuelta
   y el juez la lee. Ambos viajan en el campo `user`, nunca en el `system`.
2. **El material a evaluar viaja como JSON, no entre delimitadores.** Comillas,
   saltos de línea y llaves dentro del texto del docente los escapa el
   codificador, así que no hay secuencia que se pueda escribir para salirse del
   propio campo. Un delimitador que se puede tipear es un delimitador que se va
   a tipear.

Y el juez **nunca devuelve un total**: propone puntajes por dimensión y el
backend computa el total con los pesos de la rúbrica. Un total que viene del
modelo es un total que se puede negociar.

## La dirección de un curso publicado no cambia

`UpdateCourse` rechaza cambiar el slug de un curso publicado
(`published_slug_change`). No guardamos alias: la dirección ya está en los
marcadores de estudiantes y en lo que el instructor pegó en un grupo, y
cambiarla haría 404 en silencio todos esos enlaces.

El camino honesto es retirarlo del catálogo primero. Así el enlace roto es una
decisión que alguien tomó, y no algo que le pasó a los estudiantes sin que nadie
se enterara.

La regla protege **la dirección, no el curso**: título, resumen, descripción y
nivel se siguen editando con el curso publicado.

Estaba bloqueado solo en la UI. Una regla que la API no hace cumplir no es una
regla: es una sugerencia para quien la llame directo.

## Almacenamiento de objetos

Mismo patrón que el LLM: un puerto, adaptadores, elegidos por configuración.

```sh
ILIA_STORAGE_PROVIDER=s3        # vacío = adaptador local (solo desarrollo)
ILIA_STORAGE_BUCKET=ilia-media
ILIA_STORAGE_REGION=us-east-1
ILIA_STORAGE_ACCESS_KEY=...
ILIA_STORAGE_SECRET_KEY=...
ILIA_STORAGE_ENDPOINT=          # para R2, MinIO, Spaces, B2
```

Un adaptador cubre **S3, Cloudflare R2, MinIO, DigitalOcean Spaces y Backblaze
B2**: lo único que cambia es el endpoint y la región.

### Decisiones

**La API nunca sirve los bytes.** Un video de curso son decenas de megas y una
municipalidad entera lo mira a las nueve de la mañana. Pasarlo por el proceso de
Python convierte el trabajo de un CDN en nuestro cuello de botella y nuestra
factura de ancho de banda. La API responde «dónde está y si podés», el
almacenamiento sirve.

**Las URLs expiran.** El contenido de los cursos es lo que venden los planes
pagos. Una URL pública permanente es un enlace que una persona pega en un grupo
y regala el catálogo entero: sin login, sin plan y sin forma de revertirlo. Se
firma por pedido, **después** de verificar la inscripción — por eso el enlace es
corto y no vive guardado en la lección.

**Las subidas van directo al bucket.** Cien megas pasando por la API ocupan un
worker durante minutos y no compran nada.

**Firma SigV4 a mano, sin boto3.** Usamos un algoritmo de un SDK que trae
decenas de megas y el modelo de servicio de doscientas APIs. Es una cadena de
HMAC documentada, corta de leer — que importa más de lo habitual en el código
que decide quién puede leer un archivo. Y una firma mal calculada **falla
ruidosamente** (403): no existe el modo silencioso donde una firma mala da
acceso. `tests/test_storage_sigv4.py` la verifica contra el ejemplo publicado
por AWS.

**El adaptador local se niega a arrancar en producción**, porque no firma nada y
sirve por la API. Y se niega a subir archivos en vez de fingirlo: un adaptador
de desarrollo que simula subidas esconde lo único que hay que probar contra un
bucket real antes de lanzar.

### Subir el material de una lección

Tres pasos, porque la subida no pasa por acá:

1. `POST /instructor/courses/{id}/lessons/{id}/media` → devuelve una URL firmada
   y **la clave que eligió el servidor**.
2. El navegador hace `PUT` de ese archivo **directo al bucket**.
3. `PUT /instructor/courses/{id}/lessons/{id}/media` con la referencia → la
   lección apunta al objeto. `null` la quita.

**La clave nunca viene del cliente.** Un cliente que elige su propia clave es un
cliente que puede escribir encima del video de otro curso. Y al adjuntar se
verifica que la referencia esté dentro del prefijo de esa lección: sin eso, un
instructor podría adjuntar cualquier clave que pudiera nombrar — leyendo, o
pisando, un curso que no puede ver.

**El content-type va firmado** y hay una lista blanca. Permitir `text/html`
sería un archivo servido desde nuestro propio dominio que no escribimos
nosotros.

Verificado contra MinIO real: subida `200`, objeto en el bucket, y la lectura
posterior **`200` con firma / `403` sin ella**.

## Autoría de actividades de laboratorio

`POST /instructor/courses/{id}/modules/{id}/activities` crea la actividad **y su
rúbrica en una sola operación**. Una actividad sin rúbrica es una que un docente
puede abrir y que no puede calificarlo; dejar una ventana donde exista una sin la
otra es dejar esa ventana abierta en producción.

**El ancla determinística se agrega siempre**, la pida el instructor o no, y no
se puede redefinir. Sin ella un juez comprometido decide la nota entera — que no
es hipotético: es el hallazgo que hizo que `passed` exija dos condiciones y no
una. Si el instructor manda una dimensión con la clave `deterministic`, se
descarta y se usa la nuestra.

**Los requisitos verificables se le muestran al docente antes de escribir.**
Reprobar por una comprobación que nadie mencionó es una trampa, no una clase.

Cada dimensión declara si juzga **el prompt** o **el resultado** (PRD 9.1): quien
obtuvo una buena respuesta por suerte y quien escribió una buena instrucción no
merecen la misma nota. Los pesos son relativos y se normalizan al calificar, así
que quitar una dimensión no reescala la nota de nadie.

## El temario anuncia la actividad

`Module` lleva `activities` además de `lessons`. Sin eso la actividad existía en
la base y **nada en el producto apuntaba a ella**: una docente terminaba las
lecciones y no tenía forma de llegar al ejercicio para el que se armó el curso.

La respuesta trae solo **título e intentos**, nunca el enunciado ni las
comprobaciones. Eso es el ejercicio en sí, y leerlo va detrás de la inscripción.
A quien todavía no se inscribió, ver que el módulo termina en una práctica le da
un motivo para inscribirse — no un botón que lo rechaza.

Las actividades se cargan con una consulta aparte y no con una relación del ORM:
viven en las tablas de `evaluation`, y atar los dos modelos acoplaría el esquema
del catálogo al de otra feature.

## La corrección de una nota es respondible

Una nota ajustada por el instructor **no pisa** la automática: quedan las dos,
con motivo, autor y fecha. Sobreescribir destruiría el rastro que hace
defendible la corrección, que es justamente lo que el TRD §9.3 dice que necesita
la certificación.

Y el motivo **le llega a la persona de la que se trata**. Una nota cambiada por
razones que la docente no puede ver es peor que una que puede discutir — la
misma regla que ya seguía el certificado anulado, donde «revocado» sin motivo
invita a suponer culpable al titular de algo sin especificar.

La justificación es obligatoria: el botón de guardar está deshabilitado sin
ella. Una corrección sin justificación no es revisable.

## Índices que hacen falta a escala

Dos consultas escaneaban la tabla entera. Con los datos de desarrollo no se
nota: **Postgres elige seq scan en tablas chicas y hace bien**. Por eso medirlas
con cuatro cursos no prueba nada — hay que cargar volumen realista.

- `course(instructor_id)`: lo filtra cada pantalla del instructor — su lista de
  cursos, el chequeo de propiedad en cada edición y la bandeja de revisión.
  Medido con 200 instructores × 25 cursos: pasa de `Seq Scan` a `Bitmap Heap
  Scan`.
- `submission(updated_at) WHERE status IN ('pending','running')`: lo recorre la
  recuperación de la cola **en cada arranque**. Parcial a propósito: `scored` y
  `failed` son la abrumadora mayoría y ninguno es candidato, así que el índice
  queda chico por más entregas que acumule la plataforma. Medido con 80.000
  entregas: encuentra las 87 sin terminar sin tocar las otras 79.913.

Para medir de verdad: base aparte, `generate_series` con la **forma** real de
los datos (muchos instructores con pocos cursos, no uno con todos), `ANALYZE`, y
`EXPLAIN (ANALYZE)`.

## El cupo cuenta compromisos, no solo gastos

Medido, no supuesto: con cupo 1 y dos entregas enviadas a la vez, **se cobraban
dos**. El contador leía el historial de consumo, y esa fila solo aparece cuando
la evaluación termina — que contra un proveedor real son segundos.

Ahora cuenta lo gastado **más lo comprometido**: una entrega en vuelo va a
producir exactamente una fila de consumo, así que descontarla ya es lo que hace
que el límite sea un límite.

Y el orden importa: la fila de consumo se escribe **antes** de marcar la entrega
como `scored`. Al revés queda una ventana donde la entrega ya no está en vuelo y
su consumo todavía no existe — y ahí no la cuenta ninguno de los dos lados. Ese
era el resto del agujero.

**Una carrera es una respuesta, no un crash.** Dos pedidos por el mismo intento
chocan contra la restricción única `(user_id, activity_id, attempt)`, que es lo
que evita una segunda evaluación que nadie pidió. Antes salía como 500 con traza;
ahora es un 409 `submission_in_flight` y la docente lee «ese intento ya se está
evaluando».

### Lo que todavía es provisorio

- **El proveedor de LLM se configura, no se elige en el código.** Sin
  `ILIA_LLM_PROVIDER` corre `infrastructure/local_provider.py`, que produce
  salida válida y **no evalúa nada** — el feedback lo dice en voz alta. Con un
  proveedor configurado evalúa de verdad. Ver «Proveedores de LLM» más abajo.
- **La cola corre en el proceso de la API** (`infrastructure/queue.py`). La
  tecnología de cola sigue abierta (TRD §5.2), pero ya **sobrevive un
  reinicio**: `recover_abandoned` corre al arrancar y retoma lo que un proceso
  muerto dejó a medias. El reclamo es atómico (`FOR UPDATE SKIP LOCKED`), así
  que dos réplicas arrancando juntas no pueden correr la misma evaluación y
  cobrarla dos veces. Tras `MAX_RECOVERIES` intentos se cierra con una falla
  honesta: un reintento cuesta una llamada real al modelo, y una entrega que
  mata al worker no se arregla probando una cuarta vez.
- **Una entrega fallida no gasta intento.** `failed` solo ocurre por excepción
  —proveedor caído o bug nuestro—; un prompt malo saca nota baja, no falla.
  Cobrarle el intento sería facturarle al docente nuestra propia caída.
- **Sin cupos.** `UnlimitedQuota` hasta que se definan los números del tier
  gratuito (PRD pregunta abierta 4). La política ya es un puerto y está testeada.
- **Sin calibración.** El TRD §6.3 lo pide antes de certificar a nadie: corregir
  a mano una muestra y comparar. Sin proveedor, no hay nada que calibrar todavía.

## Certificados

| Método | Ruta | Autenticación |
|---|---|---|
| `GET` | `/api/v1/certificates/verify/{code}` | **Ninguna. Pública.** |
| `GET` | `/api/v1/certificates/me` | Docente |
| `GET` | `/api/v1/certificates/eligibility/{slug}` | Docente |
| `POST` | `/api/v1/certificates/{slug}` | Docente |
| `POST` | `/api/v1/certificates/{id}/revoke` | **Admin** |

### La verificación es pública, y es el punto

Una escuela, la Alcaldía o un empleador escriben el código y obtienen una
respuesta **sin crear cuenta**. Eso es lo que hace que la certificación valga
algo (PRD §8).

Por eso mismo revela lo mínimo: nombre, curso, fecha y si sigue vigente. Sin
correo, sin id, sin progreso. **Verificar un certificado no puede convertirse en
una forma de buscar a alguien.**

### Otras decisiones

**El código es aleatorio, no secuencial.** Uno adivinable dejaría enumerar todos
los certificados que la plataforma emitió jamás. Y usa un alfabeto sin `O/0` ni
`I/1/L`, porque un código se lee en voz alta y lo tipea alguien que no es quien
lo recibió. Se muestra agrupado (`ABCD-2345-EFGH`) y se acepta con o sin guiones.

**El nombre y el título del curso se copian al emitir**, no se buscan al
verificar. Un certificado dice lo que era cierto cuando se ganó; una página de
verificación que cambia porque alguien editó su perfil no es una página de
verificación.

**Un certificado revocado no desaparece: falla la verificación y dice por qué**
(PRD A-04). Uno que se esfumara sería indistinguible de uno que nunca existió, y
"revocado" sin motivo deja al titular presuntamente culpable de algo sin
especificar. Revocar **exige un motivo** — el dominio se niega sin él.

**Emitir es idempotente.** Pedirlo dos veces devuelve el que ya tenés. Dos
códigos para un mismo logro son dos cosas que verificar y una que explicar.

**Los criterios (PRD §10, umbral exacto *[A confirmar]*):** todas las lecciones
completadas y todas las actividades evaluadas aprobadas. Como aprobar una
actividad ya exige cumplir sus requisitos objetivos, **no se llega a un
certificado solo con un puntaje inflado por el juez.** Un curso vacío nunca
califica.

**Y cuando no alcanza, se dice qué falta.** "Todavía no" sin explicación es lo
más frustrante que esta plataforma le puede decir a alguien que viene trabajando.

## Foro

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/v1/forum/{slug}/threads` | Discusiones del curso, la más activa primero |
| `POST` | `/api/v1/forum/{slug}/threads` | Abrir una discusión |
| `GET` | `/api/v1/forum/{slug}/threads/{id}` | La discusión con sus respuestas |
| `POST` | `/api/v1/forum/{slug}/threads/{id}/replies` | Responder |
| `POST` | `/api/v1/forum/threads/{id}/hide` | Moderar una discusión |
| `POST` | `/api/v1/forum/posts/{id}/hide` | Moderar una respuesta |

### El PRD y el mockup se contradicen

La pregunta abierta 8 del PRD dice *"el mockup sugiere por módulo"*. **No es
así:** la pantalla del mockup se titula **"Foro del curso"** y su subtítulo
cuenta discusiones de todo el curso (*"Creación de imágenes con IA · 34
discusiones"*).

El TRD §7 permite ambos, así que `module_id` es nullable: **null = discusión del
curso**, que es el default y lo que muestra el mockup. Si el equipo decide que
las quiere por módulo, el filtro ya está.

### Decisiones

**Se listan por última actividad, no por fecha de creación.** Un foro ordenado
por antigüedad entierra la conversación que la gente está teniendo. Y
`last_activity_at` está guardado, no derivado: ordenar por un `max()` sobre todas
las respuestas es un sort que la base rehace en cada carga de página. Hay índice
compuesto `(course_id, last_activity_at)`.

**Un mensaje moderado se reemplaza, no se borra.** Queda la fila y el lector ve
`[Mensaje retirado por moderación]`. Borrarlo reescribiría en silencio una
conversación en la que otros ya respondieron, y dejaría a alguien preguntándose
a qué contestaba el mensaje de arriba. Moderar **exige un motivo**.

**Un instructor modera sus propios cursos, no los ajenos.** Esa comprobación
vive en la capa de aplicación, no en `interface`, porque necesita el curso para
decidir — el chequeo de rol solo no alcanza.

**Un instructor no necesita inscribirse para moderar.** Si no, tendría que
anotarse en todos los cursos que supervisa.

**No se puede leer una discusión a través de otro curso.** Sin esa comprobación,
cualquier id de hilo sería legible desde cualquier curso en el que estés inscrito.

**No está el corte freemium.** El PRD §11 divide el foro en *lectura gratis /
participación paga*, pero el sistema de planes no existe todavía y **no lo
simulo**. Hoy la puerta es la inscripción.

## Instructor

Todas las rutas exigen rol `instructor`. Ese es **solo el primer portón**: si
este instructor es dueño de *este* curso se decide en la capa de aplicación,
porque necesita el curso para responder.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/v1/instructor/courses` | Mis cursos, **borradores incluidos** |
| `POST` | `/api/v1/instructor/courses` | Crear (nace como borrador) |
| `PUT` | `/api/v1/instructor/courses/{id}` | Editar datos |
| `POST` | `/api/v1/instructor/courses/{id}/publish` | Publicar |
| `POST` | `/api/v1/instructor/courses/{id}/unpublish` | Retirar del catálogo |
| `POST` | `/api/v1/instructor/courses/{id}/modules` | Agregar módulo |
| `POST` | `/api/v1/instructor/courses/{id}/modules/{mid}/lessons` | Agregar lección |
| `GET` | `/api/v1/instructor/submissions` | Bandeja de entregas |
| `POST` | `/api/v1/instructor/submissions/{id}/override` | Corregir la nota |
| `GET` | `/api/v1/instructor/courses/{id}/roster` | Inscritos y su avance |

### Decisiones

**Los cursos nacen como borrador.** Nadie debería descubrir su curso a medio
escribir en el catálogo. Publicar es un acto aparte y deliberado.

**Publicar exige que el curso esté completo**, y cuando no lo está devuelve
**todos** los motivos, no el primero. Un instructor al que le dicen "no se puede
publicar" de a un motivo por vez lo va a arreglar de a un viaje por vez.
`publish_blockers` viaja también en los cursos ya publicados, así se entera de
que rompió algo en el momento, no la próxima vez que intente publicar.

Los bloqueos: sin título, resumen de menos de 20 caracteres, sin módulos, sin
lecciones, o módulos vacíos. Cada uno existe por un docente del otro lado — un
curso vacío desperdicia la única visita que el PRD §2.2 dice que tenemos.

**Retirar archiva, no borra.** Los inscritos conservan el acceso y sus
certificados siguen siendo verificables (PRD A-04).

**Republicar conserva la fecha original de publicación.** Si no, un curso viejo
volvería al tope del catálogo como si fuera nuevo.

**Las posiciones de módulos y lecciones las asigna el servidor**, no el cliente.
Así dos módulos nunca pueden reclamar el mismo lugar.

**Un módulo tiene que pertenecer a *este* curso.** Sin esa comprobación, un
instructor podría agregarle lecciones al curso de otro pasando el id de un
módulo ajeno. Hay un test que lo verifica.

**El override de nota se escribe al lado, nunca encima** (PRD I-03). Sobreviven
la nota automática, la humana, quién la cambió, cuándo y por qué. Sin eso la
corrección tampoco es defendible — y es el mecanismo que el TRD §9.3 dice que la
certificación necesita.

**El roster incluye el correo.** Es el curso propio del instructor, y contactar
al docente que se quedó a mitad de camino es exactamente para lo que se mira esa
lista.

### Nota sobre los tests

`tests/integration/test_instructor_api.py` hace su setup con `asyncio.run` en
funciones **síncronas**. No es capricho: `TestClient` corre la app en su propio
event loop y una fixture async de pytest corre en otro; compartir un engine
asyncpg entre los dos falla con *"attached to a different loop"*. Cada llamada
de setup abre su propio loop y su propio engine, así no se comparte nada.

## Administración

Todas las rutas exigen rol `admin`.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/v1/admin/overview` | Estado global de la plataforma (PRD A-01) |
| `GET` | `/api/v1/admin/usage?days=30` | Consumo de LLM y costo (PRD A-03) |
| `GET` | `/api/v1/admin/users?q=` | Usuarios, con búsqueda |
| `POST` | `/api/v1/admin/users/{id}/role` | Cambiar rol (PRD A-02) |
| `GET` | `/api/v1/admin/audit` | Bitácora de acciones sensibles |

### Decisiones

**Los roles se otorgan, nunca se reclaman.** No hay ninguna ruta de
autoservicio a instructor o admin en toda la plataforma. Un admin los concede, y
queda registrado.

**Un admin no puede cambiarse el rol a sí mismo**, y **no se puede degradar al
último admin**. Cualquiera de las dos deja la plataforma sin nadie que pueda
volver a conceder el rol, recuperable solo editando la base a mano.

**El costo se calcula con precios de configuración**, no con una constante.
`ILIA_LLM_INPUT_PRICE_PER_MILLION` y `ILIA_LLM_OUTPUT_PRICE_PER_MILLION` valen
cero hasta que se elija proveedor (TRD §2.6) — hardcodear un precio que nadie
acordó produce un reporte de costos que parece autoritativo y es inventado.

Por eso la respuesta trae `prices_configured`: **un cero que significa "sin
configurar" no puede mostrarse como un cero que significa "gratis".** El cliente
muestra una advertencia en vez de un total falso.

**El consumo por usuario se ordena por gasto, no por nombre.** El sentido de esa
lista es encontrar quién cuesta más, no buscar a alguien.

**`audit_log` es solo-append por construcción**: la entidad no tiene ningún
método que la modifique. Una bitácora que se puede editar no es una bitácora. Y
`actor_name` se copia, no se joinea — tiene que seguir diciendo quién hizo algo
después de que esa cuenta desaparezca.

## Planes y freemium

| Método | Ruta | Autenticación |
|---|---|---|
| `GET` | `/api/v1/billing/plans` | **Ninguna. Pública.** |
| `GET` | `/api/v1/billing/me` | Docente |

### Los números son datos, no código

`plan` es una tabla. El cupo del tier gratuito y el precio del pago siguen
abiertos (PRD pregunta 4), y un límite hardcodeado en Python necesita un deploy
para moverse. Cambiarlos es un `UPDATE`.

El seed carga `free` (10 evaluaciones/mes, ruta básica) y `pro` (200, todas las
rutas) — **son un punto de partida para poder probar el flujo, no una decisión.**

**`price_cents` del plan pago va en `null`.** Mostrar un precio que nadie acordó
es peor que no mostrar ninguno; el cliente dice *"Precio a definir"*. Misma
postura que con los precios de tokens del panel de admin.

### Los cuatro gates (PRD §11)

| Gate | Dónde | Error |
|---|---|---|
| Nivel del curso | al inscribirse | `plan_level_not_allowed` |
| Certificado descargable | al emitirlo | `plan_certificates_not_allowed` |
| Publicar en el foro | al abrir hilo o responder | `plan_posting_not_allowed` |
| Cupo de evaluaciones | al enviar un prompt | `evaluation_quota_exceeded` |

**El gate está en inscribirse, no en ver.** Un curso experto se sigue viendo
completo en el catálogo: esconderlo impediría que el docente descubra que hay
algo por lo que valdría la pena pagar.

**La elegibilidad del certificado se calcula y se muestra igual.** Un docente que
se lo ganó tiene que saber que se lo ganó, aunque su plan no se lo entregue.

**Leer el foro es gratis, participar no.** El cliente reemplaza el compositor por
la explicación, en vez de dejar un botón que responde 403.

### Cómo se cuenta el cupo

**Desde el ledger de `llm_usage`, no desde un contador.** Un contador se
desincroniza la primera vez que se pierde una escritura, y el ledger es contra lo
que se concilia la factura de todos modos: así el cupo y la cuenta del proveedor
nunca pueden discrepar.

El período es el **mes calendario**. *"Tu cupo se renueva el 1"* es algo que un
docente puede tener en la cabeza; *"30 días desde la primera vez que lo usaste"*
no.

### Otras decisiones

**`NULL` significa ilimitado; `0` significa ninguna.** Confundirlos es cómo un
plan pago deja de funcionar en silencio. Hay tests para las dos.

**Instructores y administradores no son clientes** de la plataforma que operan.
Cobrarle a un instructor por evaluar su propia actividad sería absurdo, y además
haría imposible probar un curso antes de publicarlo.

**Una suscripción vencida cae al plan por defecto, no al vacío.** Perder acceso a
lo que ya hiciste porque se venció un pago es cómo una plataforma pierde a
alguien para siempre.

**Sin planes configurados, todo es ilimitado.** Una mala configuración debe
degradar en una plataforma generosa, no en una rota.

## Convenciones

- **Errores.** Todos los endpoints devuelven la misma envoltura:
  `{"error": {"code", "message", "detail"}}`. El `code` es un identificador
  estable y legible por máquina; el texto que ve el usuario lo decide el cliente,
  no el backend.
- **Correlation id.** Cada respuesta lleva `X-Request-Id`. Si el cliente envía
  uno, se respeta. Sin esto no se puede reconstruir una evaluación que atraviesa
  HTTP, cola y proveedor de LLM.
- **Idioma.** Código, identificadores y comentarios en inglés. La documentación
  del proyecto, en español.
