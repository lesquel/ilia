# ILIA — cliente

Cliente de ILIA para iOS, Android y web desde una misma base de código.
React Native + React Native Web sobre Expo, con Expo Router.

## Requisitos

- Node 20+
- Un emulador o un dispositivo con Expo Go para probar en nativo

## Puesta en marcha

```bash
cd apps/mobile
npm install
npm run web        # navegador
npm run android    # emulador o dispositivo Android
npm run ios        # simulador iOS (requiere macOS)
```

### Variables de entorno

Crea un `.env` en `apps/mobile/` con:

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
```

Las variables `EXPO_PUBLIC_*` se **inlinean en el bundle**, así que son públicas
por definición: un APK se descomprime y un bundle web se lee. Ninguna clave
secreta va aquí. Si no defines la variable, `core/config/env.ts` cae a
`http://localhost:8000`.

## Comandos

```bash
npm run typecheck   # tsc --noEmit
npm run lint
npx expo export --platform web   # build estático de la web
```

## Estructura

```
src/
  app/                  Rutas de Expo Router. Solo composición: una ruta
                        monta una pantalla de feature, no contiene lógica.
  core/                 Transversal, sin lógica de negocio
    api/                Cliente HTTP y configuración de TanStack Query
    config/             Variables de entorno
    errors/             Errores de API tipados
    theme/              Design tokens extraídos del mockup
    ui/                 Design system y componentes base
  features/
    <feature>/
      domain/           Entidades e interfaces de repositorio
      data/             Implementación del repositorio, DTOs y mappers
      application/      Casos de uso y hooks de query/mutation
      presentation/     Pantallas y componentes
```

Features implementadas: `auth`, `catalog`.
Previstas: `enrollment`, `learning`, `lab`, `forum`, `certificates`, `profile`,
`instructor`, `admin`.

## Rutas

| Ruta | Pantalla |
|---|---|
| `/` | Portada |
| `/login` | Iniciar sesión |
| `/catalog` | Catálogo, con búsqueda, filtro por nivel y scroll infinito |
| `/catalog/[slug]` | Detalle del curso con su temario |

En web son URLs reales y compartibles, que es para lo que los cursos se
direccionan por slug y no por UUID.

## Reglas de dependencia

- `presentation` → `application` → `domain`.
- `data` implementa las interfaces declaradas en `domain`. **`domain` no importa
  nada de `data` ni de React.**
- Ninguna feature importa desde el interior de otra. Si dos necesitan compartir,
  sube a `core` o expón un punto de entrada público en la feature.
- Los DTOs de la API viven en `data` y se convierten a entidades de dominio
  mediante mappers. La pantalla nunca ve la forma cruda de la respuesta.

## Móvil y web desde un mismo código

`domain`, `data` y `application` son **idénticos** en las tres plataformas. Toda
la divergencia se concentra en `presentation`.

Cuando una pantalla necesite comportarse distinto, usa resolución por extensión
de plataforma (`Pantalla.tsx` / `Pantalla.web.tsx`) en lugar de llenar el código
de condicionales. Es la diferencia entre dos implementaciones legibles y una
implementación ilegible.

Y hay que decirlo claro: **habrá pantallas que se escriban dos veces**, sobre
todo las de instructor y admin. Un panel con tablas densas no se resuelve con
componentes pensados para un teléfono. Es un costo asumido, no un descuido.

## Deuda y decisiones abiertas

- **Fuentes.** Los tokens declaran Barlow y Barlow Condensed, pero todavía no se
  empaquetan como assets. Hasta que se haga, el sistema usa su fallback. No
  pueden depender de la red: los docentes tienen datos limitados.
- **Almacenamiento del token.** En móvil va al almacén seguro del sistema; en
  web, `localStorage` lo expone a XSS. La alternativa es una cookie `httpOnly`,
  que implica una estrategia de sesión distinta en el backend. `AuthTokenProvider`
  en `core/api/http-client.ts` es el punto donde esa decisión se materializa.
- **Peso del bundle.** El primer export de web pesa 1.2 MB. El TRD ya lo marcaba
  como riesgo (T9): toca carga diferida por ruta, sobre todo en instructor y
  admin, que el estudiante nunca abre.
- **Iconos y splash** siguen siendo los de la plantilla de Expo.

## Trampa conocida: `Link asChild` y los estilos

`expo-router` con `asChild` renderiza el hijo **como** el `<a>` en web, y el
anchor **descarta el `style` del `Pressable`**. El resultado es una tarjeta sin
padding, sin borde y sin fondo — y no falla en compilación ni en el typecheck,
así que solo se ve mirando el navegador.

La forma correcta es poner todos los estilos visuales en un `View` interno:

```tsx
<Link href="/catalog/mi-curso" asChild>
  <Pressable accessibilityRole="link">
    {({ pressed }) => (
      <View style={[styles.card, { opacity: pressed ? 0.85 : 1 }]}>…</View>
    )}
  </Pressable>
</Link>
```
