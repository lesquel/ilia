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

| Pieza | Estado |
|---|---|
| PRD y TRD v0.1 | ✅ Completos, con preguntas abiertas marcadas |
| Design system extraído del mockup | ✅ En `apps/mobile/src/core/theme/tokens.ts` |
| Backend — esqueleto, config, logs, errores, health | ✅ Corre, con tests, lint y tipos en verde |
| Cliente — esqueleto Expo, router, tema, cliente HTTP | ✅ Compila para web y tipa en strict |
| CI | ✅ Lint, tipos, tests y build web en cada push |
| Auth — backend y cliente | ✅ Registro, login, refresh, logout y `/me`. Cookie `httpOnly` en web, bearer en nativo |
| Persistencia de usuarios | ⚠️ En memoria. Se pierde al reiniciar — esperando la decisión de base de datos |
| Catálogo, inscripción, aprendizaje | ⬜ Pendiente |
| Laboratorio IA y motor de EVALs | ⬜ Pendiente |
| Foro, certificados, freemium | ⬜ Pendiente |
| Pantallas de instructor y admin | ⬜ Sin diseñar |

## Puesta en marcha

```bash
# Backend
cd apps/api && uv sync && uv run uvicorn app.main:app --reload

# Cliente
cd apps/mobile && npm install && npm run web
```

Detalle en [`apps/api/README.md`](apps/api/README.md) y
[`apps/mobile/README.md`](apps/mobile/README.md).

## Decisiones que bloquean el siguiente paso

El TRD §15 lista once. Estas cuatro son las que impiden avanzar más allá del
scaffolding, por orden de impacto:

1. ~~**Estrategia de sesión en web.**~~ ✅ **Decidido:** cookie `httpOnly` para
   web, bearer token para nativo. Implementado en las dos puntas. Trae una
   restricción de despliegue: el cliente web y la API deben compartir dominio
   registrable. Ver [`apps/api/README.md`](apps/api/README.md#autenticación).
2. **Base de datos y dónde se despliega.** Sin esto no hay persistencia real:
   hoy los usuarios viven en memoria y se pierden al reiniciar.
3. **Proveedor y modelo de LLM.** Bloquea el motor de EVALs, que es el corazón
   del producto.
4. **Cohortes sí o no.** Si las charlas presenciales generan cohortes, hace falta
   la entidad `cohort` ligada a `enrollment`. Añadirla ahora es barato; después
   es una migración con datos vivos. (PRD pregunta abierta 7, TRD §7)

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
