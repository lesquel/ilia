# Práctica individual 2.3 · Víctor Zambrano

## Proceso seleccionado

El módulo traduce dos representaciones de una entrega de código al contrato común de ILIA. El origen A representa el editor web existente. El origen B representa un cliente externo simulado desde Postman.

Las rutas de esta práctica permiten observar la transformación con una respuesta HTTP 200. Devuelven el contrato normalizado y consultan la tarea existente para validarlo. Las entregas se registran a través del endpoint habitual de la práctica 2.2.

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `app/Services/NormalizadorEntrega.php` | Traduce y valida ambas estructuras. |
| `app/Http/Controllers/NormalizacionEntregaController.php` | Lee el JSON original, comprueba el acceso de estudiante y llama al servicio. |
| `routes/web.php` | Integra las rutas autenticadas de normalización en el módulo. |
| `tests/Feature/NormalizacionEntregaTest.php` | Comprueba equivalencia, conservación del código, validación y permisos. |

## Mapeo de campos

| Origen A | Origen B | Contrato común | Regla |
|---|---|---|---|
| `exercise_id` | `tarea.id` | `exercise_id` | Entero positivo. En B admite una cadena de dígitos. |
| `language` | `lenguaje` | `language` | Recortar espacios externos, convertir a minúsculas y validar el lenguaje de la tarea. |
| `code` | `codigoFuente` | `code` | Conservar contenido, sangría y saltos de línea. |
| `history` | `pasos` | `history` | Conservar el orden y validar de 1 a 100 pasos. |
| `history[].kind` | `pasos[].accion` | `history[].kind` | `escritura` → `typing`, `pegado` → `paste`. |
| `history[].code` | `pasos[].contenido` | `history[].code` | Conservar el contenido, incluida una versión vacía. |
| `history[].pasted_chars` | `pasos[].caracteresPegados` | `history[].pasted_chars` | En B convertir cadenas de dígitos a enteros. |
| `ai_usage` | `asistencia` | `ai_usage` | `ninguna` → `none`, `consulta` → `consultation`, `generacion` → `generation`. |

Las acciones y la asistencia externas admiten espacios externos y mayúsculas antes de traducirlas. Los números en texto deben contener solamente dígitos. Se rechazan decimales, exponentes, booleanos, cadenas con espacios o letras y valores que excedan el rango entero. El contrato A exige enteros JSON.

El contrato común reutiliza las reglas de `StoreCodeSubmission` y comprueba la coherencia de los pasos. Cada pegado tiene un tamaño positivo, cada edición tiene tamaño cero y el código del último paso coincide exactamente con la entrega final. Los errores se devuelven como JSON con estado 422.

## Ejecutar

Usa la configuración de Laravel de la práctica anterior, con su `.env` y su base SQLite ya preparados. Desde `apps/entregas-codigo-victor` ejecuta en PowerShell:

```powershell
php artisan route:list --path=normalizacion-entregas
php artisan test
php artisan serve --host=localhost --port=8010
```

Para Postman, conserva las cookies y usa `Content-Type: application/json` y `Accept: application/json`.

1. Solicita `GET http://localhost:8010/acceso/csrf` y copia el token.
2. Inicia sesión con `POST http://localhost:8010/acceso/login`, el correo `student@practica.test`, tu contraseña de práctica y el token en el header `X-CSRF-TOKEN`.
3. Solicita de nuevo `GET /acceso/csrf` y usa ese token actualizado en los POST de normalización.

## P1 · Origen A válido

Envía este cuerpo a `POST http://localhost:8010/api/practica/normalizacion-entregas/web`:

```json
{
  "exercise_id": 1,
  "language": "python",
  "code": "print('Hola')",
  "history": [
    {
      "kind": "paste",
      "code": "print('Hola')",
      "pasted_chars": 13
    }
  ],
  "ai_usage": "none"
}
```

## P2 · Origen B equivalente

Envía este cuerpo a `POST http://localhost:8010/api/practica/normalizacion-entregas/externo`:

```json
{
  "tarea": {
    "id": "1"
  },
  "lenguaje": " Python ",
  "codigoFuente": "print('Hola')",
  "pasos": [
    {
      "accion": "pegado",
      "contenido": "print('Hola')",
      "caracteresPegados": "13"
    }
  ],
  "asistencia": "ninguna"
}
```

Ambos casos deben devolver HTTP 200 y exactamente esta estructura, con los mismos valores y tipos:

```json
{
  "data": {
    "exercise_id": 1,
    "language": "python",
    "code": "print('Hola')",
    "history": [
      {
        "kind": "paste",
        "code": "print('Hola')",
        "pasted_chars": 13
      }
    ],
    "ai_usage": "none"
  }
}
```

El ejemplo usa la tarea 1 con lenguaje Python, cargada en la práctica anterior.

## P3 · Entrada inválida

En el cuerpo de P2 cambia únicamente `"id": "1"` por `"id": "uno"`. Envía a la misma ruta externa. Debe devolver HTTP 422 con un mensaje en `errors["tarea.id"]`. Conserva una captura de cada prueba con URL, solicitud, estado y respuesta.

## Ubicación de la transformación

El servicio concentra el mapeo, la normalización y la validación para que los controladores puedan reutilizar el mismo comportamiento. Cada método conoce el formato de su origen y devuelve el contrato de ILIA. El controlador conserva la lectura del JSON original para mantener los espacios y las cadenas vacías del código, que forman parte de la solución del estudiante.

## Verificación automatizada

Las pruebas nuevas comparan ambas respuestas con igualdad estricta, comprueban el rechazo de números ambiguos y valores desconocidos, la conservación de sangría y saltos de línea, la coherencia del historial, el lenguaje de la tarea y los roles. También verifican que la operación de normalización conserve la cantidad de entregas.
