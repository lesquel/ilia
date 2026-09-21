# Primera charla — decisiones que no se reabren a mitad de camino

Estas son las respuestas para el piloto de Manta. No son el PRD. Si una charla
posterior necesita otra cosa, se cambia ahí; el esquema no.

## Host y dominio

Aún no hay host elegido. La sesión web es cookie `httpOnly`: el cliente y la
API tienen que compartir **un dominio registrable**. Sin eso, el navegador no
manda la cookie. No se inventa un hostname acá.

## LLM

Hasta que el entorno tenga `ILIA_LLM_PROVIDER` y `ILIA_LLM_API_KEY`, el motor
corre el stub local. El motor que evalúa es `RunEvaluation` (Python). No es
LangGraph.

`ILIA_LLM_PROVIDER` — uno de: `anthropic`, `openai`, `gemini`, `deepseek`,
`openai-compatible`. Modelos por defecto (sobreescribibles con `ILIA_LLM_MODEL`):
`claude-sonnet-4-5`, `gpt-4o-mini`, `gemini-2.0-flash`, `deepseek-chat`.
`openai-compatible` exige además `ILIA_LLM_MODEL` e `ILIA_LLM_BASE_URL`.

Cómo se prueba, sin llamar a un proveedor de pago:

```sh
curl -sS http://localhost:8000/health/ready
```

El campo `llm` tiene que ser el nombre del proveedor, **no** `local-stub`.
Esas notas del stub **no son reales** y no se certifica a nadie con ellas.

## Certificación

Para la primera charla: código + verificación pública. No se escribe
«oficial». No hay PDF. El umbral de emisión se queda como está en el
producto; la copia no promete ministerio ni descarga.

## Videos

El texto de las lecciones alcanza. Los seis guiones están en
`docs/curriculum/ruta-docentes.md`. Hasta que alguien suba el archivo, la
lección se lee. Cambiar a `kind=video` es un acto en el panel de instructor,
no un deploy.

## Recuperación de contraseña

Fuera de la primera charla. Quien se trabe, lo atiende quien esté en la sala.

## Freemium

Se dejan las filas de plan que ya siembra la migración (`free` y `pro`).
Números editables con un `UPDATE`; no hay camino de pago en este piloto.

## Mesa

El currículo canónico está en `docs/curriculum/`. No se inventan códigos de
destreza ni cifras de Ineval. La voz de la lección es sala de profesores; Lía
no habla ahí.

## Catálogo

Un compose nuevo no tiene cursos. Publicarlos:

```sh
docker compose run --rm api python -m scripts.seed_catalog
```

Slugs: `prompting-para-docentes`, `notebooklm-en-el-aula`,
`evaluacion-asistida-por-ia`.
