# Recuperación de contraseña (entrega asistida)

ILIA aún no tiene proveedor de correo transaccional. El flujo de PRD E-01 sigue
implementado en backend y cliente, pero la **entrega del token** es manual y
auditada.

## Flujo para el docente

1. En **Iniciar sesión** → **Olvidé mi contraseña**, indica su correo y envía.
   La respuesta es siempre la misma (no revela si la cuenta existe).
2. Acude a su **instructor** o al equipo ILIA en la charla.
3. El instructor genera un **código de recuperación** (válido 24 h, un solo uso)
   desde la consola de instructor/admin (`POST /api/v1/auth/password-reset/issue`).
4. El docente abre **Restablecer contraseña**, pega el código y elige una clave nueva.
5. Entra con la clave nueva; las sesiones anteriores quedan invalidadas.

## Flujo para instructor o admin

- Requiere sesión con rol `instructor` o `admin`.
- Endpoint: `POST /api/v1/auth/password-reset/issue` con `{ "email": "docente@colegio.edu" }`.
- La respuesta incluye `reset_token` **una sola vez** — entréguelo en persona o por
  un canal ya acordado con el piloto (no por correo hasta tener SMTP).
- La acción queda en el **audit log** (`password_reset_issued`).

## Seguridad

| Propiedad | Cómo |
|-----------|------|
| Sin enumeración | Misma respuesta 204 al pedir reset |
| Token de un uso | `used_at` al confirmar |
| Expira | 24 h (`ILIA_PASSWORD_RESET_TTL_HOURS`) |
| Hash en reposo | Argon2id, igual que contraseñas |
| Fin de sesiones | `token_generation` al completar |
| Auditoría | `password_reset_issued` / `password_reset_completed` |
| Límite de intentos | Misma ventana que login (`reset_request`, `reset_confirm`) |

Cuando exista correo transaccional, el paso 3 puede enviar el token por email sin
cambiar el modelo de datos.
