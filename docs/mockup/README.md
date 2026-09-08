# Mockup — 16 pantallas del rol estudiante

## Archivos

| Archivo | Qué es |
|---|---|
| `plataforma-educativa-ia.bundle.html` | Bundle original de Claude Design. Autoextraíble: ábrelo en el navegador y se desempaqueta solo (trae React y las imágenes embebidas en base64). |
| `plataforma-educativa-ia.source.html` | El HTML fuente extraído del bundle. Es el que sirve como referencia al implementar: contiene el design system completo y el marcado de las 16 pantallas, legible en cualquier editor. |

El `source` no se renderiza tal cual: usa etiquetas de plantilla del canvas
(`sc-if`, `sc-for`, `{{ ... }}`). Se lee, no se ejecuta. Para ver el prototipo
funcionando, usa el `bundle`.

## Inventario de pantallas

Todas son del rol **Estudiante**. Las de Instructor y Administrador no existen
todavía (TRD §4.3).

| # | Pantalla | Notas de implementación |
|---|---|---|
| 1 | Landing | Pública. Hero, cursos destacados, "aprende haciendo", qué incluye la plataforma |
| 2 | Login | Pública |
| 3 | Registro | Pública |
| 4 | Catálogo | Pública. Filtros por nivel y categoría |
| 5 | Detalle de curso | Pública. Banner, temario, instructor, CTA de inscripción |
| 6 | Dashboard | Shell autenticado. Continuar donde quedó + progreso |
| 7 | Mis cursos | Listado con progreso por curso |
| 8 | Lección | Vista de aprendizaje: contenido + navegación lateral de módulos |
| 9 | Actividad | Enunciado de la actividad de prompt |
| 10 | Preguntas | Comprobación rápida dentro de la lección |
| 11 | Foro | Hilos por módulo |
| 12 | Evaluaciones | Historial de entregas y sus puntuaciones |
| 13 | Laboratorio IA | **Pantalla crítica.** Editor de prompt + ejecución |
| 14 | Resultado | Salida generada, puntuación por dimensión, feedback del instructor |
| 15 | Certificados | Listado y descarga |
| 16 | Perfil | Datos del usuario y ritmo de estudio |

## Design system

Extraído del `:root` del mockup. Es la fuente de verdad para los tokens del
cliente.

### Color

Tema claro:

| Token | Valor |
|---|---|
| `bg` | `#f2f2f3` |
| `surface` | `#e9e9ea` |
| `text` | `#1d1f20` |
| `accent` | `#5980a6` |
| `accent-2` | `#728fab` |
| `divider` | `#1d1f20` al 16% |

Tema oscuro:

| Token | Valor |
|---|---|
| `bg` | `#15181b` |
| `surface` | `#1d2126` |
| `text` | `#e8eaec` |
| `accent` | `#7ea6cd` |
| `divider` | `#e8eaec` al 18% |

Rampas tonales de 100 a 900 para `neutral`, `accent` y `accent-2`, generadas en
OKLCH sobre una misma escala de luminosidad: el paso N de cualquier rampa tiene
el mismo valor visual que el paso N de las otras.

### Tipografía

- Titulares: **Barlow Condensed**, peso 600.
- Cuerpo: **Barlow**.
- Fallback: `system-ui, sans-serif`.

Ambas son de Google Fonts, así que en móvil hay que empaquetarlas como assets de
la app y no depender de la red.

### Espaciado

Escala de base 3.4px: `1`=3.4 · `2`=6.8 · `3`=10.2 · `4`=13.6 · `6`=20.4 · `8`=27.2.

En React Native no hay `rem`, así que estos valores pasan a números crudos y se
redondean donde el subpíxel no aporte nada.

### Radios y elevación

Radios `sm`=2px · `md`=4px · `lg`=7px. Tres niveles de sombra (`sm`/`md`/`lg`)
tintados con `#2b2b2d`. En tema oscuro la elevación se resuelve con un borde
capilar más oscuridad ambiental, no con sombra proyectada.

## Layout responsive

El mockup ya viene resuelto para web con *container queries* sobre `.rroot`:

| Ancho | Comportamiento |
|---|---|
| > 1080px | Shell completo: sidebar + contenido; rejillas de 3 y 4 columnas |
| ≤ 1080px | Rejillas de 3/4 columnas colapsan a 2; el aside de la vista de aprendizaje desaparece |
| ≤ 760px | Todo a una columna; el sidebar se oculta y aparece la barra de navegación inferior (`.mobnav`); los titulares bajan de 70px a 38px |

Esto confirma lo que dice el TRD §4.3: **el mockup sirve casi directamente como
referencia de la versión web**, pero la versión nativa no es una conversión
mecánica — hay que replantear navegación (pestañas y pila en lugar de sidebar),
densidad de información y sobre todo el editor del laboratorio.

## Deuda conocida del mockup

- La marca dice `PRAXIS.AI`; el producto se llama **ILIA**. Todo el marcado
  hay que reinterpretarlo con el nombre nuevo.
- Faltan por completo las pantallas de **Instructor** y **Administrador**.
- Los datos son estáticos: no hay estados de carga, vacío ni error, y esos
  estados sí hay que diseñarlos antes de implementar.
