# ILIA

Plataforma multiplataforma (iOS · Android · Web) de formación y certificación en
Inteligencia Artificial. Su diferenciador: **no evalúa con exámenes de opción
múltiple, sino midiendo la calidad de los prompts que el estudiante escribe y de
los resultados que obtiene.**

Primer segmento: docentes de Manta, en alianza con la Dirección de Educación
Complementaria de la Alcaldía.

> El nombre **ILIA** reemplaza a `PRAXIS.AI`, que era el placeholder usado en el
> mockup y en las versiones 0.1 del PRD y el TRD.

## Estado

Fase de arranque. La documentación de requisitos está completa (v0.1); la
implementación está en scaffolding.

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/PRD_PRAXIS_AI_v0.1.md`](docs/PRD_PRAXIS_AI_v0.1.md) | Producto: roles, alcance del MVP, historias de usuario, motor de EVALs, negocio, riesgos |
| [`docs/TRD_PRAXIS_AI_v0.1.md`](docs/TRD_PRAXIS_AI_v0.1.md) | Técnico: arquitectura, stack, modelo de datos, API, seguridad, pruebas |
| [`docs/mockup/`](docs/mockup/) | Mockup de las 16 pantallas del rol estudiante + design system extraído |

## Estructura del repositorio

```
apps/
  api/        Backend Python (FastAPI) — Clean Architecture por features
  mobile/     Cliente React Native + React Native Web (Expo) — Clean Architecture por features
docs/         PRD, TRD y mockup
```

## Stack

Las decisiones marcadas *(propuesta)* provienen de las recomendaciones del TRD y
siguen pendientes de confirmación por el equipo.

| Área | Elección |
|---|---|
| Cliente | React Native + React Native Web, con Expo *(propuesta)* |
| Lenguaje cliente | TypeScript *(propuesta)* |
| Datos de servidor | TanStack Query *(propuesta)* |
| Backend | Python + FastAPI *(propuesta)* |
| Base de datos | PostgreSQL *(propuesta)* |
| Orquestación de IA | LangGraph |
| Arquitectura | Clean Architecture organizada por features, en cliente y backend |

## Roles

- **Estudiante** — el docente que se capacita. Consume lecciones, escribe prompts en el Laboratorio IA, recibe puntuación y obtiene certificado.
- **Instructor** — crea cursos, define actividades y rúbricas, revisa entregas y puede sobrescribir la puntuación automática.
- **Administrador** — gestión global de usuarios, catálogo, certificados y costos de LLM.

## Licencia

Privado. Todos los derechos reservados.
