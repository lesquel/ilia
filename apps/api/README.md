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

### Datos de demo

```bash
uv run python -m scripts.seed_demo
```

Tres cursos con temario, para tener qué renderizar mientras se produce el
contenido real. Se niega a correr en producción.

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
