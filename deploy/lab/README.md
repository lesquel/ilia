# Despliegue de laboratorio ILIA (5 portátiles, una LAN)

Cada integrante levanta un nodo en su propio portátil. Todos comparten un único archivo de configuración (`lab.env`) con las direcciones IP.

| Portátil | Nodo | Tecnología | Puertos |
|---|---|---|---|
| 1 | Balanceador (LB) | Nginx en Docker | 80 |
| 2 | Frontend | `apps/mobile` (build web) en Docker | 8080 |
| 3 | Backend | 2 contenedores de `apps/api` + migración | 8001, 8002 |
| 4 | Base de datos | **Ubuntu Server** + PostgreSQL por `apt` (sin Docker) | 5432, 22 |
| 5 | Archivos | MinIO en Docker | 9000, 9001 |

Flujo de una petición: navegador → `http://LB_IP` → LB → (`/` al frontend, `/api/` a backend 8001/8002 en round robin) → PostgreSQL (portátil 4) y MinIO (portátil 5).

## 0. Preparación común (todos los portátiles)

1. Conectar todos los equipos a la **misma red** (mismo Wi-Fi o mismo switch) y confirmar que el aislamiento de clientes (AP isolation) del router esté desactivado.
2. Clonar el repositorio y crear el archivo de configuración:
   ```bash
   cd ilia/deploy/lab
   cp lab.env.example lab.env
   ```
3. Obtener la IP de cada portátil (ver sección siguiente) y editar `lab.env` con las IP reales: `LB_IP`, `FRONTEND_IP`, `BACKEND_IP`, `DB_IP`, `FILES_IP`, `LAB_SUBNET`. Cambiar también las contraseñas y generar el secreto JWT (`openssl rand -hex 32`).
4. **El `lab.env` debe ser idéntico en los cinco equipos.** Se recomienda fijar una IP estática o una reserva DHCP para cada portátil; si una IP cambia, hay que actualizar `lab.env` y reiniciar los nodos afectados (el frontend además debe reconstruirse).

### Cómo obtener la IP de cada equipo

| Sistema | Comando |
|---|---|
| Windows | `ipconfig` (campo "Dirección IPv4" del adaptador Wi-Fi/Ethernet) |
| macOS | `ipconfig getifaddr en0` (Wi-Fi; usar `en1` si no responde) |
| Linux / Ubuntu | `hostname -I` o `ip addr` |

### Firewall

**Windows (PowerShell como administrador).** Por defecto Windows bloquea el ping (ICMP) y los puertos entrantes. Ejecutar solo las reglas del nodo que corresponda, más la de ICMP:

```powershell
# Permitir ping (todos los nodos)
New-NetFirewallRule -DisplayName "ILIA ICMPv4" -Protocol ICMPv4 -IcmpType 8 -Direction Inbound -Action Allow

# Portátil 1 (LB)
New-NetFirewallRule -DisplayName "ILIA LB 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
# Portátil 2 (Frontend)
New-NetFirewallRule -DisplayName "ILIA Frontend 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
# Portátil 3 (Backend)
New-NetFirewallRule -DisplayName "ILIA API 8001" -Direction Inbound -Protocol TCP -LocalPort 8001 -Action Allow
New-NetFirewallRule -DisplayName "ILIA API 8002" -Direction Inbound -Protocol TCP -LocalPort 8002 -Action Allow
# Portátil 5 (MinIO)
New-NetFirewallRule -DisplayName "ILIA MinIO 9000" -Direction Inbound -Protocol TCP -LocalPort 9000 -Action Allow
New-NetFirewallRule -DisplayName "ILIA MinIO 9001" -Direction Inbound -Protocol TCP -LocalPort 9001 -Action Allow
```

Si la red está clasificada como "Pública", Windows aplica reglas más estrictas: cambiarla a "Privada" en Configuración → Red e Internet, o agregar `-Profile Any` a cada regla.

**macOS.** Si el firewall está activo (Ajustes del Sistema → Red → Firewall), permitir conexiones entrantes para Docker Desktop/Colima cuando el sistema lo solicite, o desactivar el firewall durante la práctica. macOS responde a ping por defecto salvo que esté activado el "modo sigiloso".

**Ubuntu (portátil 4).** `setup.sh` configura `ufw` automáticamente.

## 1. Portátil 4: base de datos (Ubuntu Server)

Es el nodo que cumple el requisito de Ubuntu Server. PostgreSQL se instala con `apt`, no con Docker.

### Opción A: portátil con Ubuntu Server instalado directamente
Instalar Ubuntu Server 24.04 LTS (marcar "Install OpenSSH server" durante el instalador).

### Opción B: máquina virtual con UTM en Mac Apple Silicon
1. Descargar **Ubuntu Server 24.04 LTS para ARM64** e instalar UTM.
2. En UTM: *Crear una nueva máquina virtual* → *Virtualizar* → *Linux* → seleccionar la ISO. Asignar 2 GB de RAM, 2 núcleos y 20 GB de disco.
3. **Red en modo puenteado**: en la configuración de la VM → *Red* → *Modo de red: Puenteado (avanzado)* → *Interfaz puenteada: en0*. Así la VM obtiene una IP de la misma LAN, visible por los demás portátiles (el modo compartido/NAT no sirve).
4. Instalar Ubuntu Server y marcar **Install OpenSSH server**. Al terminar, retirar la ISO y reiniciar.
5. Dentro de la VM, la IP es la de `hostname -I`; esa es la `DB_IP`.

Para Intel/x86 el procedimiento es el mismo con la ISO amd64 (modo *Emular* en UTM, más lento).

### Configuración
Copiar `lab.env` (o el directorio `deploy/lab`) a la VM, por ejemplo con `scp` desde otro equipo, y ejecutar:

```bash
cd deploy/lab
sudo ./ubuntu-db/setup.sh --env-file ./lab.env
```

El script es idempotente. Instala PostgreSQL, OpenSSH y ufw; detecta la versión mayor instalada; habilita `listen_addresses='*'`; agrega la regla `pg_hba` para `LAB_SUBNET` con `scram-sha-256`; crea el rol y la base de datos; abre en `ufw` solo SSH y el puerto 5432 desde la subred; y al final imprime los comandos de evidencia.

**Versión de PostgreSQL.** Ubuntu 24.04 instala PostgreSQL 16, mientras que `docker-compose.yml` del repositorio usa `postgres:17`. Se revisaron las migraciones de Alembic (`apps/api/migrations/versions`): usan tipos y funciones estándar (`now()`, `JSON`, `Boolean`, `Text`) sin nada específico de PG 17, por lo que PG 16 es compatible. Aun así, la primera ejecución del `migrate` (paso 3) es la prueba definitiva.

## 2. Portátil 5: archivos (MinIO)

```bash
cd deploy/lab/files
docker compose --env-file ../lab.env up -d
```

Crea el bucket privado `ILIA_STORAGE_BUCKET` mediante el contenedor `minio-init`. Verificar: consola en `http://FILES_IP:9001` (usuario y clave de `ILIA_STORAGE_ACCESS_KEY` / `ILIA_STORAGE_SECRET_KEY`) y `docker compose --env-file ../lab.env ps -a` (`minio-init` debe terminar con código 0).

## 3. Portátil 3: backend

```bash
cd deploy/lab/backend
docker compose --env-file ../lab.env up -d --build
docker compose --env-file ../lab.env ps
```

Primero corre `migrate` (`alembic upgrade head`) contra PostgreSQL del portátil 4; solo si termina bien arrancan `api-1` (puerto 8001) y `api-2` (puerto 8002). Si falla, revisar `docker compose --env-file ../lab.env logs migrate` (causas típicas: IP de la BD incorrecta, `pg_hba`, firewall).

Verificar desde el mismo equipo: `curl http://localhost:8001/health/ready` y `curl http://localhost:8002/health/ready`.

Catálogo inicial (opcional, una sola vez):
```bash
docker compose --env-file ../lab.env run --rm api-1 python -m scripts.seed_catalog
```

Notas de diseño: el entorno es `staging` con `ILIA_COOKIE_SECURE=false` porque el laboratorio usa HTTP plano (en `production` la API se niega a arrancar sin cookies seguras). `ILIA_STORAGE_PROVIDER=s3` es el valor que MinIO requiere. La cola de evaluación y el limitador de tasa viven en la memoria de cada réplica (ver `apps/api/README.md`); con dos réplicas el límite de intentos se cuenta por separado, lo cual es aceptable para esta práctica.

## 4. Portátil 2: frontend

```bash
cd deploy/lab/frontend
docker compose --env-file ../lab.env up -d --build
```

La URL de la API se incorpora al compilar: `EXPO_PUBLIC_API_URL=http://LB_IP`. La aplicación agrega sola el prefijo `/api/v1` (`apps/mobile/src/core/config/env.ts`), y las rutas de la API ya viven bajo `/api/v1`; por eso la URL base va **sin** `/api` y el LB **no** elimina el prefijo. Si cambia `LB_IP`, reconstruir con `--build`. La primera compilación puede tardar varios minutos.

Verificar: `http://FRONTEND_IP:8080` debe mostrar la aplicación.

## 5. Portátil 1: balanceador

```bash
cd deploy/lab/lb
docker compose --env-file ../lab.env up -d
```

Nginx genera su configuración desde `nginx.conf.template` con `BACKEND_IP` y `FRONTEND_IP`. Reparte `/api/` en round robin entre `BACKEND_IP:8001` y `BACKEND_IP:8002` (`max_fails=2`, `fail_timeout=10s`, `proxy_next_upstream` ante errores de conexión, timeout y 502/503/504) y envía `/` al frontend. Añade la cabecera `X-Upstream-Addr` para ver qué réplica respondió.

Verificar: abrir `http://LB_IP` desde cualquier otro equipo.

**Orden de arranque:** BD (4) → Archivos (5) → Backend (3) → Frontend (2) → LB (1).

## 6. Lista de evidencias

Sustituir `LB_IP`, `DB_IP`, etc. por las direcciones reales. Capturar pantalla del comando y de su resultado.

### 6.1 Configuración de red de cada nodo (los 5)

| Sistema | Comando | Qué se comprueba / Resultado esperado |
|---|---|---|
| Windows | `ipconfig /all` | Que el equipo tiene IP en la subred del laboratorio; aparece la IPv4 registrada en `lab.env`. |
| macOS | `ifconfig en0` o `ipconfig getifaddr en0` | Que el equipo tiene IP en la subred del laboratorio; coincide con `lab.env`. |
| Linux/Ubuntu | `hostname -I` y `ip addr` | Que la interfaz activa tiene la IP esperada y está en estado `UP`. |

### 6.2 Conectividad entre nodos (ping)

| Comando | Qué se comprueba / Resultado esperado |
|---|---|
| `ping LB_IP` (desde el frontend) | Conectividad LB ↔ Frontend; respuestas sin pérdida (`0% packet loss`). |
| `ping BACKEND_IP` (desde el LB) | Conectividad LB ↔ Backend; respuestas sin pérdida. |
| `ping DB_IP` (desde el backend) | Conectividad Backend ↔ BD; respuestas sin pérdida. |
| `ping FILES_IP` (desde el backend) | Conectividad Backend ↔ Archivos; respuestas sin pérdida. |

En Windows, `ping` fallará si no se creó la regla ICMPv4 de la sección de firewall.

### 6.3 Acceso a un servicio desde otra máquina

| Comando / acción | Qué se comprueba / Resultado esperado |
|---|---|
| Navegador en un equipo distinto al LB: `http://LB_IP` | El servicio web es accesible en la red; se carga la aplicación ILIA. |
| `http://FRONTEND_IP:8080` | El frontend responde de forma directa (nodo independiente). |
| `http://FILES_IP:9001` | La consola de MinIO es accesible y muestra el bucket `ilia`. |

### 6.4 Consumo de la API desde otra máquina (a través del LB)

| Comando | Qué se comprueba / Resultado esperado |
|---|---|
| `curl -i http://LB_IP/health` | Liveness de la API a través del LB; `HTTP/1.1 200` y cabecera `X-Upstream-Addr`. |
| `curl -i http://LB_IP/health/ready` | Readiness: la API alcanza PostgreSQL y el almacenamiento; `200` con la base de datos en estado `ok` y `storage: s3`. |
| `curl -s -o /dev/null -D - http://LB_IP/health` repetido 4 veces (en PowerShell: `curl.exe -s -o NUL -D - http://LB_IP/health`) | Round robin: `X-Upstream-Addr` alterna entre `BACKEND_IP:8001` y `BACKEND_IP:8002`. |
| `curl -i http://LB_IP/api/v1/catalog/courses` (ruta real de solo lectura; verificar en `http://LB_IP/docs`) | Consumo de un endpoint versionado; `200` y JSON (vacío si no se cargó el catálogo). |
| Postman: `GET http://LB_IP/health/ready` | Igual que el punto anterior desde una herramienta gráfica. |
| Detener `api-1` en el backend (`docker compose --env-file ../lab.env stop api-1`) y repetir `curl http://LB_IP/health` | Tolerancia a fallos: el servicio sigue respondiendo solo por `:8002`. Reiniciar con `start api-1`. |

Si la ruta `/api/v1/catalog/courses` no existe en la versión desplegada, elegir cualquier `GET` público de la documentación en `http://LB_IP/docs`.

### 6.5 Ubuntu Server (portátil 4)

| Comando | Qué se comprueba / Resultado esperado |
|---|---|
| `lsb_release -a` y `hostname` | Instalación: la distribución es Ubuntu Server (`Ubuntu 24.04 LTS`). |
| `hostname -I` y `ip addr` | Dirección IP de la VM/equipo dentro de la LAN (igual a `DB_IP`). |
| `systemctl status postgresql --no-pager` | Servicio PostgreSQL `active (running)` y habilitado. |
| `systemctl status ssh --no-pager` | Servicio SSH `active (running)` y habilitado. |
| `ss -tlnp \| grep 5432` | PostgreSQL escucha en `0.0.0.0:5432` (no solo en `127.0.0.1`). |
| `sudo ufw status verbose` | Firewall activo con SSH y 5432 permitidos solo desde `LAB_SUBNET`. |
| Desde **otro portátil**: `ssh USUARIO@DB_IP` | Acceso remoto por SSH funcional; se obtiene el prompt de Ubuntu (capturar `hostname` dentro de la sesión). |
| Desde el backend: `docker run --rm postgres:17-alpine psql "postgresql://ilia:CLAVE@DB_IP:5432/ilia" -c "\dt"` | La base es accesible por red desde el nodo backend; lista las tablas creadas por la migración. |

## 7. Solución de problemas

| Síntoma | Causa probable |
|---|---|
| `migrate` falla con timeout o "connection refused" | `DB_IP` incorrecta, firewall de `ufw` o subred distinta de `LAB_SUBNET`. |
| `migrate` falla con "password authentication failed" | La contraseña de `lab.env` difiere de la usada en `setup.sh`; volver a ejecutar el script tras corregir. |
| El navegador carga la página pero las llamadas a la API fallan | Frontend compilado con otra `LB_IP`; reconstruir con `up -d --build`. |
| `502 Bad Gateway` en el LB | Backend detenido o puertos 8001/8002 bloqueados por el firewall del portátil 3. |
| Subida de archivos falla en el navegador | `FILES_IP` incorrecta en `lab.env` (las URL firmadas apuntan a MinIO) o puerto 9000 bloqueado. |
