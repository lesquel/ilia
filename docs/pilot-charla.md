# Primera charla — decisiones que no se reabren a mitad de camino

Estas son las respuestas para el piloto de Manta. No son el PRD. Si una charla
posterior necesita otra cosa, se cambia ahí; el esquema no.

## Host y dominio

**Decidido: mismo host.** El edge de `docker compose` sirve la UI y la API bajo
un solo origin. Cookie host-only: `ILIA_COOKIE_DOMAIN` vacío.

| Variable | Valor del piloto (HTTP local) |
|---|---|
| `ILIA_CORS_ORIGINS` | `["http://localhost:8080"]` |
| `ILIA_COOKIE_DOMAIN` | vacío |
| `EXPO_PUBLIC_API_URL` | `http://localhost:8080` |
| `ILIA_ENVIRONMENT` | `staging` (pasar a `production` + `ILIA_COOKIE_SECURE=true` cuando el edge tenga TLS) |

El hostname público real (si deja de ser `localhost`) es un dato de ops: se
cambia en `.env` y se reconstruye la imagen web. No hace falta inventarlo en el
repo.

Smoke, en el navegador, contra el edge, sin tokens en `localStorage`:

1. Registrarse (`POST /api/v1/auth/register`).
2. Iniciar sesión (`POST /api/v1/auth/login`).
3. Pedir el perfil (`GET /api/v1/auth/me`).

Application → Cookies: `ilia_session` e `ilia_refresh`, las dos `HttpOnly`.
Application → Local Storage: sin `access_token` ni `refresh_token`. El cuerpo
de login/register en web trae solo el perfil.

## LLM

**Decidido: multi-proveedor, listo para la clave.** El motor es `RunEvaluation`.
No es LangGraph. Compatibles sin tocar código: `anthropic`, `openai`, `gemini`,
`deepseek`, `openai-compatible`.

Hasta que `.env` tenga `ILIA_LLM_PROVIDER` **y** `ILIA_LLM_API_KEY`, corre el
stub. Dejá los dos vacíos hasta pegar la clave: un proveedor nombrado sin clave
falla al arrancar.

Modelos por defecto (sobreescribibles con `ILIA_LLM_MODEL`):
`claude-sonnet-4-5`, `gpt-4o-mini`, `gemini-2.0-flash`, `deepseek-chat`.
`openai-compatible` exige además `ILIA_LLM_MODEL` e `ILIA_LLM_BASE_URL`.

```sh
curl -sS http://localhost:8080/health/ready
```

El campo `llm` tiene que ser el nombre del proveedor, **no** `local-stub`.
Notas del stub **no** certificar.

## Almacenamiento

**Decidido: MinIO (API S3) en el compose.** El adaptador local no se usa en el
piloto. Variables: `ILIA_STORAGE_*` apuntando al puerto publicado de MinIO
(`http://localhost:9000` en local). El mismo adaptador sirve para AWS/R2/Spaces
cambiando el endpoint.

## Certificación

Para la primera charla: código + verificación pública. No se escribe
«oficial». No hay PDF. El umbral de emisión se queda como está en el
producto; la copia no promete ministerio ni descarga.

## Videos

El texto de las lecciones alcanza. Los seis guiones están en
`docs/curriculum/ruta-docentes.md`. El bucket ya acepta subidas firmadas desde
instructor (web). Hasta que alguien suba el archivo, la lección se lee. Cambiar
a `kind=video` es un acto en el panel de instructor, no un deploy. La lámina
HyperFrames se renderiza cuando haya tiempo de contenido; no bloquea la charla.

## Recuperación de contraseña

Stopgap asistido por instructor (API + pantallas). Ver
`apps/api/docs/recuperacion-contrasena-asistida.md`. Correo propio sigue
pendiente de proveedor.

## Freemium

Se dejan las filas de plan que ya siembra la migración (`free` y `pro`).
Números editables con un `UPDATE`; no hay camino de pago en este piloto.

## Mesa

El currículo canónico está en `docs/curriculum/`. No se inventan códigos de
destreza ni cifras de Ineval. La voz de la lección es sala de profesores; Lía
no habla ahí.
