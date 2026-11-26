# Práctica individual 3.2 — Línea de tiempo, enrutamiento y filtrado

Autor de la contribución: Victor Zambrano Martínez.
Aplicar sobre el ZIP `ILIA_Base_Practica_3_2.zip` enviado desde la rama
`victor/practica-3-2-enrutamiento`, creada desde `origin/main`.

## Funcionalidad implementada

- Instructor: **Agregar tarea** abre un formulario modal. Permite elegir curso
  oficial, escribir título/consigna/lenguaje y establecer fecha y hora límite.
- El instructor cambia o elimina el vencimiento desde el detalle de su tarea.
- Estudiante: línea de tiempo con Todos, Atrasados, Próximos 7 días y Completadas;
  búsqueda por tarea/curso y orden por fecha/curso. Abre el mismo editor existente.
- Se muestra el horario de Ecuador continental (`America/Guayaquil`). Se almacena UTC.
- Las entregas y los reportes anteriores conservan sus rutas y contratos.
- Las tareas anteriores quedan como «Sin curso asignado» y sin vencimiento. Se pueden
  añadir fechas; no se asignan cursos ni se reasignan propietarios automáticamente.
- Las entregas anteriores se incorporan a la proyección de completadas durante la
  migración, conservando la última entrega de cada estudiante/tarea.

## Cursos oficiales, no un catálogo duplicado

Se añade GET `/api/v1/auth/code-module/courses` a FastAPI, protegido con la misma
credencial delegada y clave de servicio de la integración anterior.

- Estudiante: cursos en los que está inscrito, consultados en el repositorio oficial.
- Instructor: cursos de su autoría, incluyendo borradores.
- Admin: catálogo publicado más sus propios cursos, conforme a su capacidad de gestión.
- Laravel consulta y valida esta lista antes de asignar un curso; no acepta un UUID
  de un curso ajeno porque lo haya enviado el navegador.
- Las tareas de un curso solo son visibles para estudiantes inscritos en ese curso.
  La comprobación también protege el editor, las entregas y la normalización.
- Para crear/gestionar cursos, el formulario enlaza al área de instructor oficial.
  No se crean cursos locales independientes en Laravel.
- Una tarea de un curso borrador será útil para sus estudiantes cuando puedan
  inscribirse en él según las reglas de publicación de ILIA.
- Las tareas oficiales antiguas sin curso conservan su visibilidad anterior;
  las cuentas de práctica siguen separadas de las oficiales.

## Patrón real implementado

Los filtros de pantalla son consultas visuales. **No son el Message Filter**.

| Tipo/condición del mensaje | Destino | Justificación |
|---|---|---|
| `tarea.publicada` | `ConsumidorPublicacion` / publicaciones | Incorpora el deber a la agenda |
| `tarea.fecha_modificada`, fechas diferentes | `ConsumidorFecha` / fechas | Actualiza el vencimiento sin duplicar el deber |
| `entrega.registrada` | `ConsumidorEntrega` / entregas | Marca la entrega para ese estudiante |
| Cambio de fecha con el mismo valor UTC | `filtrado`, sin cola | Evita trabajo innecesario por guardar sin cambios |
| Tipo desconocido | `no_enrutable`, sin cola | Conserva el mensaje y el motivo para revisión |
| Falta un campo obligatorio | HTTP 422, sin evento | Rechaza el contrato antes de filtrar/enrutar |

El campo `prioridad` admite `baja`, `normal`, `alta`; es metadato del contrato.
La selección del destino se realiza por `tipo`. No se configura prioridad AMQP
ni se afirma que un mensaje de prioridad alta se adelante en las colas.

RabbitMQ REAL al ejecutar los comandos. No son tres ramas de un método simulando
una cola: se declaran tres colas durables enlazadas a un exchange `direct`.

| Exchange | Routing key | Cola |
|---|---|---|
| `ilia.victor.agenda` | `tarea.publicada` | `ilia.victor.agenda.publicaciones` |
| mismo | `tarea.fecha_modificada` | `ilia.victor.agenda.fechas` |
| mismo | `entrega.registrada` | `ilia.victor.agenda.entregas` |

Los registros `filtrado` y `no_enrutable` permanecen en `agenda_events`; no existe
una cola «no_enrutables» en esta implementación. La guía permite un resultado
controlado, sin descartar silenciosamente los mensajes.

## Instalación local Windows

1. Detener Laravel y los consumidores antes de copiar. Conservar las bases y `.env`.
   Copiar la carpeta `apps` del paquete sobre la raíz de ILIA aceptando reemplazos.
   No copiar dentro de otra carpeta `apps`.
2. Respaldar la SQLite del módulo mientras está detenido. Desde la raíz:

```powershell
Copy-Item .\apps\entregas-codigo-victor\database\database.sqlite .\apps\entregas-codigo-victor\database\database.antes-3-2.sqlite
cd .\apps\entregas-codigo-victor
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan migrate
php artisan test
```

Si la conexión usa otra base, realizar su respaldo con las herramientas de esa
base. La migración es aditiva y también preserva estados de entregas anteriores.
No usar `migrate:fresh`, no regenerar `APP_KEY`, no ejecutar seed para instalarla.

3. Se reutilizan las credenciales de RabbitMQ de la práctica 3.1. No hay claves nuevas
   que configurar. La API y Expo mantienen las variables de la integración anterior.
4. Iniciar las cinco terminales:

| Terminal | Carpeta | Comando |
|---|---|---|
| API | `apps/api` | `uv run python -m scripts.run_sqlite` (modo persistente local ya utilizado) |
| Laravel | `apps/entregas-codigo-victor` | `php artisan serve --host=localhost --port=8010` |
| Interfaz | `apps/mobile` | `npm run web -- --port 8081` |
| Reportes | `apps/entregas-codigo-victor` | Mantener RabbitMQ activo; luego `php artisan reportes:consumir` |
| Agenda | `apps/entregas-codigo-victor` | `php artisan agenda:consumir` |

Antes de los consumidores, arrancar/preparar el broker desde el módulo:

```powershell
docker compose --env-file .env -f compose.reportes.yml up -d --wait
php artisan agenda:publicar
```

`agenda:publicar` declara exchange/colas y publica el outbox pendiente, sin consumir.
`agenda:consumir` publica los pendientes automáticamente y atiende las tres colas.
`php artisan agenda:consumir --once` procesa como máximo un mensaje (o termina si no hay ninguno).
La cola antigua `ilia.victor.reportes` sigue funcionando de forma independiente.

5. Abrir `http://localhost:8081`, entrar con instructor/admin, abrir el módulo y pulsar
   Agregar tarea. Elegir un curso de la lista. Con el estudiante, inscribirse en ese
   mismo curso desde ILIA si aún no está inscrito. Al procesarse la publicación,
   pulsar Actualizar en la línea de tiempo para verla. No se simulan inscripciones.

## Persistencia, entrega de mensajes y fallos

La operación del proyecto y su evento se guardan en la misma transacción en la base
Laravel (`agenda_events`, outbox persistente). El registro pendiente **no significa
que RabbitMQ ya lo recibió**. El comando lo publica con mensajes persistentes,
publicación mandatory y confirmaciones del broker; solo entonces marca `publicado`.
Si el broker falla, se conserva `pendiente` con motivo de transporte y se reintenta.
No se clasifica un fallo de conexión como un rechazo del filtro de negocio.

Cada cola tiene su consumidor específico. `agenda:consumir` los hospeda en un proceso
local y consulta las tres colas; no se crean tres servidores HTTP independientes.

Los consumidores leen los datos persistidos y verifican id/correlación/tipo/prioridad
contra el registro. Actualizan `agenda_items` o `agenda_deliveries` dentro de una
transacción; solo después confirman ACK. Una repetición no duplica resultados.
Las versiones de tarea impiden que mensajes atrasados reviertan fechas nuevas.

Un fallo de procesamiento se reencola hasta tres intentos; después queda `fallido`
en la base y se rechaza sin reencolar. No se configura una DLQ. Un mensaje malformado
se rechaza sin procesamiento ni registro de su cuerpo. Si el proceso se interrumpe
antes del ACK, RabbitMQ puede reentregarlo y la transacción/idempotencia evita duplicados.

Estados: `pendiente` → `publicado` → `procesado`; alternativas `filtrado`,
`no_enrutable`, `fallido`. La interfaz se actualiza al recargar/pulsar Actualizar.
Los filtros visuales no vuelven a procesar ni publicar eventos.

## Contrato HTTP para los seis casos de Postman

POST `http://localhost:8010/api/practica/agenda/eventos`
Headers: `Accept: application/json`, `Content-Type: application/json`,
`X-CSRF-TOKEN` con el token de la sesión Laravel vigente.

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "correlation_id": "22222222-2222-4222-8222-222222222222",
  "tipo": "tarea.publicada",
  "prioridad": "normal",
  "datos": { "tarea_id": 3 }
}
```

Usar identificadores UUID nuevos por caso y tareas reales propias. El servidor
obtiene título, versión, curso y fechas anteriores de sus datos, no del navegador.
`datos` solo admite `tarea_id`, `entrega_id`, `fecha_nueva`, según el evento.
`fecha_nueva` debe usar ISO 8601 con zona horaria, por ejemplo `2030-01-20T15:00:00Z`;
`null` elimina el vencimiento. Un tipo desconocido debe pasar la validación estructural
para llegar al resultado `no_enrutable`.

Los eventos manuales están integrados: una modificación válida cambia la fecha real
de la tarea del instructor. Para las evidencias, utilizar una tarea destinada a la
práctica, no una tarea compartida que otros integrantes estén utilizando.

## Iniciar sesión en Postman con la cuenta oficial

La sesión del navegador no se comparte automáticamente con Postman.
1. GET `http://localhost:8010/acceso/csrf`; conservar `token`.
2. POST `http://localhost:8000/api/v1/auth/login`, JSON email/password oficiales.
   Header `X-Client-Platform: web`. Las cookies quedan en Postman. No capturar la contraseña.
3. POST `http://localhost:8000/api/v1/auth/code-module/ticket`, body `{}`;
   header `Origin: http://localhost:8081`. Copiar el ticket temporal, no fotografiarlo.
4. POST `http://localhost:8010/acceso/ilia`, body `{ "ticket": "EL_TICKET" }`,
   header `X-CSRF-TOKEN` del paso 1, Accept JSON. Hacerlo antes de 60 segundos.
5. GET `http://localhost:8010/acceso/csrf` otra vez, porque se regeneró la sesión.
   Usar este nuevo token en los seis casos.

Como alternativa para conservar ejercicios previos, `/acceso/login` admite las cuentas
locales de práctica y exige que la tarea sea de ese instructor local. No permite usar
su rol para modificar tareas oficiales de otro propietario.

## Seis pruebas obligatorias

Importar `docs/practica-3-2/Agenda_3_2.postman_collection.json` si se desea.
Configurar `tarea_id`, `entrega_id` y `csrf_token` con valores reales. La entrega debe
pertenecer a esa tarea. La colección crea UUID diferentes y conserva la fecha del
segundo caso para el quinto. Ejecutar P1–P6 en orden y no exportar cookies/tokens.

Para fotografiar mensajes en espera, detener SOLO `agenda:consumir`, enviar el caso,
y ejecutar `php artisan agenda:publicar`. El consumidor antiguo de reportes no vacía
estas colas. Después reiniciar `agenda:consumir` y consultar el evento por su ID.

| Caso | Entrada | Respuesta y evidencia |
|---|---|---|
| P1 | `tarea.publicada` + tarea propia | 202 `pendiente`; luego solo cola publicaciones y registro procesado |
| P2 | `tarea.fecha_modificada` + fecha UTC distinta | 202; solo cola fechas; vencimiento actualizado en la línea de tiempo |
| P3 | `entrega.registrada` + entrega real de esa tarea | 202; solo cola entregas; estado Entregada para ese estudiante |
| P4 | `tarea.desconocida` | 200 `no_enrutable`, motivo y sin publicación |
| P5 | Cambio con la misma fecha que P2 | 200 `filtrado`, motivo y sin consumidor |
| P6 | Quitar `tipo` | 422 de validación; sin nuevo evento ni mensaje |

Consulta: GET `/api/practica/agenda/eventos/{id}` con Accept JSON y sesión del actor
o del instructor propietario. Devuelve destino, cola, decisión, motivo y fecha de
procesamiento. Una petición aceptada no garantiza que ya se procesó; consultar el estado.

Verificar además `storage/logs/laravel.log` con el correlation_id. Eventos:
`agenda.pendiente`, `agenda.publicado`, `agenda.procesado`, `agenda.filtrado`,
`agenda.no_enrutable`, `agenda.transporte_pendiente`, `agenda.procesamiento_fallido`.
No registrar claves, contraseñas, cookies ni el código entregado.

## Archivos principales de la contribución

- `app/Services/Agenda/EnrutadorAgenda.php`: Content-Based Router.
- `app/Services/Agenda/FiltroAgenda.php`: Message Filter por igualdad real del vencimiento.
- `ConsumidorPublicacion.php`, `ConsumidorFecha.php`, `ConsumidorEntrega.php`: tres destinos funcionales.
- `RabbitAgenda.php`: exchange, bindings, confirmación y publicación del outbox.
- `ConsumidorMensajesAgenda.php`, `ProcesadorAgenda.php`: validación de mensaje, transacción, ACK y reintentos.
- `app/Console/Commands/ConsumirAgenda.php` y `PublicarAgenda.php`: ejecución independiente.
- `app/Http/Controllers/AgendaController.php`: contratos, permisos y consulta de resultados.
- `LineaTiempo.php`, `CursosIlia.php`: filtros visuales y consulta oficial de cursos.
- `resources/views/instructor*.blade.php`, `student*.blade.php`, `public/practica/agenda.*`: interfaz.
- Migración `2026_11_26_000000_create_agenda_routing.php`: fechas, curso, outbox y proyecciones.
- `tests/Feature/AgendaEnrutamientoTest.php`: casos obligatorios, seguridad, orden y persistencia.
- `apps/api/.../auth/interface/code_module.py`: endpoint de cursos autorizados.

## Verificación durante la preparación

Laravel: 50 pruebas aprobadas / 537 aserciones, incluidas las 35 anteriores.
API: 543 aprobadas y 158 omitidas por dependencias de integración, más Ruff y mypy
sobre el adaptador modificado. Las pruebas usan dobles para AMQP y verifican bindings,
confirmación, persistencia, ACK tras commit y reintentos; no sustituyen las capturas
reales que debe obtener el estudiante con su RabbitMQ. Plantillas Blade renderizadas
y sintaxis JS verificadas; la interacción visual del navegador requiere revisión local.
No hay dependencias nuevas de Composer ni npm y no se modifica la aplicación Expo.

## Informe individual

Incluir selección del proceso, contrato, tabla de reglas, seis casos con evidencias,
diagrama `docs/practica-3-2/flujo-agenda.png`, manejo de no enrutables, conclusión personal
(diferencia entre enrutar y filtrar) y enlace al commit/rama indicando autoría.
Esta guía 3.2 no fija el límite de 1–3 páginas del anterior Proyecto de Aula 3.3.
