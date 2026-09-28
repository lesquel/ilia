# ILIA

Plataforma multiplataforma (iOS · Android · Web) de formación y certificación en
Inteligencia Artificial. Su diferenciador: **no evalúa con exámenes de opción
múltiple, sino midiendo la calidad de los prompts que el estudiante escribe y de
los resultados que obtiene.**

Primer segmento: docentes de Manta, en alianza con la Dirección de Educación
Complementaria de la Alcaldía.

> El nombre **ILIA** reemplaza a `PRAXIS.AI`, placeholder del mockup. Los
> documentos v0.2 viven en `docs/PRD_ILIA_v0.2.md` y `docs/TRD_ILIA_v0.2.md`
> (antes `*_PRAXIS_AI_v0.1.md`).

## Desplegar

```sh
cp docs/deploy.env.example .env   # y completá los valores
docker compose up -d --build
```

Levanta, en orden: la base, **MinIO** (bucket listo), las **migraciones hasta
terminar**, la API, el cliente web y el **edge** (un solo origin en
`WEB_PORT`). Nada arranca hasta que lo que necesita está sano.

### The first administrator

A new deployment starts without an administrator. Provision the first one only
as an explicit operator action; API startup never creates an account and no HTTP
provisioning endpoint exists.

Set these values in the deployment environment (see
[`docs/deploy.env.example`](docs/deploy.env.example)):

- `ILIA_BOOTSTRAP_ADMIN_EMAIL`
- `ILIA_BOOTSTRAP_ADMIN_NAME`
- `ILIA_BOOTSTRAP_ADMIN_PASSWORD`

Then run the audited, one-time command:

```sh
make create-admin
# Equivalent inside the API container:
# python -m app.cli create-admin
```

The command refuses production, validates all required values, hashes the
password with Argon2, and records the bootstrap in the audit log. It is idempotent
for the same existing administrator without changing that administrator's
password. It refuses an existing administrator or an account collision in every
other case. Never commit real credentials to `.env`, this example file, or source
control.

Los planes (`free` y `pro`) los siembra una migración, porque sin ellos la
plataforma no puede responder qué tiene permitido un docente. **Los números son
un punto de partida, no una decisión**: son filas, y se cambian con un `UPDATE`
sin desplegar nada.

### El catálogo

Un compose recién levantado **no tiene cursos**. Las migraciones no los cargan:
el contenido canónico vive en `apps/api/app/content/teacher_catalog.py` y hay
que publicarlo.

```sh
docker compose run --rm api python -m scripts.seed_catalog
```

Tres slugs: `prompting-para-docentes`, `notebooklm-en-el-aula`,
`evaluacion-asistida-por-ia`. Es idempotente y corre en el entorno destino. No
crea una contraseña ni una cohorte. El login de demo (`scripts.seed_demo`) es
solo local y se niega en producción.

### Decisiones

**Las migraciones son un contenedor aparte que corre una vez.** Si la API
migrara al arrancar, N réplicas competirían por alterar las mismas tablas.

**Los contenedores corren sin root y con filesystem de solo lectura.** Verificado:
un `touch` dentro de la API se rechaza. Si algo necesitara escribir, es un bug
que conviene encontrar acá y no en producción.

**Un solo contenedor de API.** La cola de evaluación vive dentro del proceso y
el limitador de intentos cuenta en su memoria: escalar a más réplicas necesita
antes la decisión del almacén compartido (TRD §5.2). Está dicho en el compose.

**La URL de la API se hornea en el bundle web.** Expo inserta las variables
`EXPO_PUBLIC_*` en tiempo de build, así que es una imagen por entorno.
Cambiar `EXPO_PUBLIC_API_URL` implica reconstruir (`docker compose up -d --build`)
— es la consecuencia honesta de un export estático, no algo que se arregle con
un placeholder que nadie recuerda reemplazar. Un `.env` nuevo no alcanza.

**Cookie `httpOnly` y mismo host.** Decidido para el piloto: un solo origin
(`edge`). `ILIA_COOKIE_DOMAIN` vacío (host-only). `SameSite=lax` no manda la
cookie entre sitios distintos — por eso web y API no van en puertos/hosts
separados hacia el navegador.

En `.env` (ver `docs/deploy.env.example` y `docs/pilot-charla.md`):

| Variable | Qué es |
|---|---|
| `ILIA_CORS_ORIGINS` | Origen exacto del edge. JSON. Ej. `["http://localhost:8080"]` |
| `ILIA_COOKIE_DOMAIN` | Vacío en topología same-host |
| `EXPO_PUBLIC_API_URL` | Misma base que el edge. Se hornea al construir; cambiarla implica reconstruir |
| `ILIA_COOKIE_SECURE` | `false` en HTTP local (`staging`); `true` con TLS (`production`) |

Las cookies se llaman `ilia_session` y `ilia_refresh`.

Smoke, en el navegador contra el edge, **sin** tokens en `localStorage`:

1. Registrarse (`POST /api/v1/auth/register`)
2. Iniciar sesión (`POST /api/v1/auth/login`)
3. Pedir el perfil (`GET /api/v1/auth/me`)

Application → Cookies: `ilia_session` e `ilia_refresh`, las dos `HttpOnly`.
Application → Local Storage: sin `access_token` ni `refresh_token`. El cuerpo
de login/register en web trae solo el perfil.

**Media en MinIO (S3).** El compose no usa storage local. Firmas path-style;
`ILIA_STORAGE_ENDPOINT` es la URL que el navegador alcanza (p. ej.
`http://localhost:9000`). AWS/R2/Spaces: mismo `ILIA_STORAGE_PROVIDER=s3`, otro
endpoint.

**El healthcheck usa `/health/ready`, no `/health`.** Son preguntas distintas:
`/health` responde «el proceso vive» y no depende de nada; `/health/ready`
consulta la base. Un fallo en el primero significa reiniciame; en el segundo,
dejá de mandarme tráfico **pero no me reinicies**, porque el problema no está
acá. Confundirlos es cómo un parpadeo de la base se vuelve un bucle de
reinicios en todas las réplicas a la vez.

`/health/ready` también informa qué proveedor de LLM y de storage está activo —
nombres, nunca claves. Ver `local-stub` ahí es cómo se detecta un despliegue que
no está evaluando nada de verdad.

### Conectar un LLM

Vacío corre el stub. El motor que evalúa es **`RunEvaluation`** (Python sobre
puertos). No es LangGraph.

En `.env` (ver `docs/deploy.env.example`):

| Variable | Qué es |
|---|---|
| `ILIA_LLM_PROVIDER` | `anthropic` · `openai` · `gemini` · `deepseek` · `openai-compatible` |
| `ILIA_LLM_API_KEY` | La clave. Solo en `.env`, nunca en git |
| `ILIA_LLM_MODEL` | Opcional. Defaults: `claude-sonnet-4-5`, `gpt-4o-mini`, `gemini-2.0-flash`, `deepseek-chat`. Obligatorio con `openai-compatible` |
| `ILIA_LLM_BASE_URL` | Obligatorio con `openai-compatible` |

Cómo se prueba, **sin** llamar a un proveedor de pago:

```sh
curl -sS http://localhost:8080/health/ready
```

El campo `llm` tiene que ser el nombre del proveedor, **no** `local-stub`. Un
proveedor nombrado sin clave falla al arrancar — dejá ambos vacíos hasta pegar
la clave. Las notas del stub no son reales y no sirven para certificar.

## Estado

**ILIA** es el producto. El código ya recorre el MVP vertical (auth, catálogo,
inscripción, lecciones, laboratorio, certificados con verificación pública, foro,
freemium, instructor y admin). La documentación de requisitos está en **v0.2**
(`docs/PRD_ILIA_v0.2.md`, `docs/TRD_ILIA_v0.2.md`): decisiones de stack que ya
están en el repo van marcadas como cerradas; lo que falta (host productivo, SEO,
PDF de certificado, etc.) sigue explícito.

| Pieza | Estado |
|---|---|
| PRD y TRD v0.2 (ILIA) | ✅ Alineados al código; preguntas abiertas marcadas |
| Design system extraído del mockup | ✅ En `apps/mobile/src/core/theme/tokens.ts` |
| Backend — esqueleto, config, logs, errores, health | ✅ Corre, con tests, lint y tipos en verde |
| Cliente — esqueleto Expo, router, tema, cliente HTTP | ✅ Compila para web y tipa en strict |
| CI | ✅ Lint, tipos, tests y build web en cada push |
| Auth — backend y cliente | ✅ Registro, login, refresh, logout y `/me`. Cookie `httpOnly` en web, bearer en nativo |
| Persistencia | ✅ PostgreSQL 17 + SQLAlchemy async + Alembic. Tablas `app_user` y `cohort` |
| Catálogo — backend y cliente | ✅ Público. Filtros, búsqueda, paginación por cursor y detalle con temario |
| Inscripción y progreso — backend y cliente | ✅ Inscripción con código de cohorte, "Mis cursos", marcado de lecciones y punto de retomada |
| Visor de lección | ✅ Texto y navegación por el temario. Reproductor de vídeo pendiente |
| Laboratorio IA y motor de EVALs | ✅ Grafo `RunEvaluation` (Python). Adaptadores de LLM listos. Default `local-stub` hasta `ILIA_LLM_PROVIDER` |
| Certificados | ✅ Emisión por criterios, código antifalsificación y **verificación pública sin cuenta**. **Sin PDF descargable** en Fase 1. Revocación de admin auditada |
| Foro | ✅ Discusiones por curso, respuestas y moderación con alcance por instructor |
| Freemium — planes, cupos y los cuatro gates | ✅ Números como datos editables, no constantes |
| Instructor — autoría, publicación, revisión y roster | ✅ Backend y cliente |
| Admin — métricas, roles, cohortes, consumo de LLM y auditoría | ✅ Backend y cliente |

## Puesta en marcha

```bash
# Backend
cd apps/api && uv sync && docker compose up -d && uv run alembic upgrade head
uv run uvicorn app.main:app --reload

# Cliente
cd apps/mobile && npm install && npm run web
```

Detalle en [`apps/api/README.md`](apps/api/README.md) y
[`apps/mobile/README.md`](apps/mobile/README.md).

## Decisiones que bloquean el siguiente paso

1. ~~**Estrategia de sesión en web.**~~ ✅ cookie `httpOnly` / bearer nativo.
2. ~~**Base de datos.**~~ ✅ PostgreSQL 17.
3. ~~**Topología web + API.**~~ ✅ **Mismo host** vía `edge` (ver
   `docs/pilot-charla.md`). El hostname público, si deja de ser `localhost`,
   es solo un cambio de `.env` + rebuild.
4. **Clave de LLM.** Multi-proveedor listo (`anthropic` · `openai` · `gemini` ·
   `deepseek` · `openai-compatible`). Pegá `ILIA_LLM_PROVIDER` +
   `ILIA_LLM_API_KEY` en `.env` cuando la tengas; hasta entonces el stub.
5. ~~**Cohortes.**~~ ✅ create en admin + join en inscripción.
6. ~~**Storage de media.**~~ ✅ MinIO (S3) en el compose; no local.

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/PRD_ILIA_v0.2.md`](docs/PRD_ILIA_v0.2.md) | Producto: roles, alcance del MVP, historias de usuario, motor de EVALs, negocio, riesgos |
| [`docs/TRD_ILIA_v0.2.md`](docs/TRD_ILIA_v0.2.md) | Técnico: arquitectura, stack, modelo de datos, API, seguridad, pruebas |
| [`docs/mockup/`](docs/mockup/) | Mockup de las 16 pantallas del rol estudiante + design system extraído |

## Estructura del repositorio

```
apps/
  api/        Backend Python (FastAPI) — Clean Architecture por features
  mobile/     Cliente React Native + React Native Web (Expo) — Clean Architecture por features
docs/         PRD, TRD y mockup
```

## Stack

Las decisiones del stack que el TRD marcaba *(propuesta)* ya están tomadas en
el código: Expo, TypeScript, TanStack Query, FastAPI. La orquestación de IA
enviada es `RunEvaluation`, no LangGraph.

| Área | Elección |
|---|---|
| Cliente | React Native + React Native Web, con Expo |
| Lenguaje cliente | TypeScript |
| Datos de servidor | TanStack Query |
| Backend | Python + FastAPI |
| Base de datos | PostgreSQL 17 |
| Orquestación de IA | `RunEvaluation` (Python sobre puertos; no LangGraph) |
| Arquitectura | Clean Architecture organizada por features, en cliente y backend |

## Roles

- **Estudiante** — el docente que se capacita. Consume lecciones, escribe prompts en el Laboratorio IA, recibe puntuación y obtiene certificado.
- **Instructor** — crea cursos, define actividades y rúbricas, revisa entregas y puede sobrescribir la puntuación automática.
- **Administrador** — gestión global de usuarios, catálogo, certificados y costos de LLM.

## Licencia

Privado. Todos los derechos reservados.
