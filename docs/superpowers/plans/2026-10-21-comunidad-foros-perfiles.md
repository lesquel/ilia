# Implementación: Comunidad, foros y perfiles internos

## Tareas
1. Extender API con proyección de foros por módulo/cohorte y perfiles internos, garantizando membresía, separación entre cohortes y filtrado de moderación antes de firmar avatares.
2. Añadir una abstracción de actividad eficiente para SQL e in-memory, con consulta de discusiones/respuestas por autor y cursos permitidos.
3. Incorporar DTOs, dominio, repositorio y consultas React Query para Comunidad y perfil en mobile.
4. Crear rutas/pantallas, navegación y enlaces desde autorías; incluir perfil propio accesible desde la navegación.
5. Revisar copy/accessibilidad y ejecutar typecheck/lint/formato según herramientas disponibles (sin pruebas automáticas salvo petición).

## Revisión de alcance
La decisión anterior de perfil personalizado excluye perfiles públicos. Esta implementación mantiene el perfil cerrado y compartido solo desde espacios módulo/cohorte con acceso comprobado. La cohorte sale de la inscripción; sin cohorte se usa el foro general del módulo. No incluye subida de imágenes a publicaciones.
