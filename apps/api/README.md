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
uv run uvicorn app.main:app --reload
```

Documentación interactiva en <http://localhost:8000/docs> (deshabilitada en
producción). Health check en <http://localhost:8000/health>.

## Comandos

```bash
uv run pytest          # pruebas
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
  shared/              Value objects y errores de dominio comunes
    errors.py
  features/
    <feature>/
      domain/          Entidades, reglas y puertos. Python puro.
      application/     Casos de uso y DTOs internos
      infrastructure/  Implementación de los puertos: repos, LLM, storage
      interface/       Routers HTTP y esquemas de request/response
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
