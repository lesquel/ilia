$ErrorActionPreference = 'Stop'
$raizIlia = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$apiEnv = Join-Path $raizIlia 'apps\api\.env'
$moduleEnv = Join-Path $raizIlia 'apps\entregas-codigo-victor\.env'
$mobileEnv = Join-Path $raizIlia 'apps\mobile\.env.local'

function Leer-Variable([string] $ruta, [string] $nombre) {
    if (-not (Test-Path $ruta)) { return '' }
    $patron = '(?m)^' + [regex]::Escape($nombre) + '=(.*)$'
    $coincidencia = [regex]::Match([IO.File]::ReadAllText($ruta), $patron)
    if ($coincidencia.Success) { return $coincidencia.Groups[1].Value.Trim().Trim('"').Trim("'") }
    return ''
}
function Guardar-Variable([string] $ruta, [string] $nombre, [string] $valor) {
    $texto = if (Test-Path $ruta) { [IO.File]::ReadAllText($ruta) } else { '' }
    $patron = '(?m)^' + [regex]::Escape($nombre) + '=[^\r\n]*'
    $linea = $nombre + '=' + $valor
    if ([regex]::IsMatch($texto, $patron)) {
        $texto = [regex]::Replace($texto, $patron, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $linea })
    } else { $texto = $texto.TrimEnd() + "`r`n" + $linea + "`r`n" }
    [IO.File]::WriteAllText($ruta, $texto, (New-Object System.Text.UTF8Encoding($false)))
}

if (-not (Test-Path $moduleEnv)) { throw 'Primero configura el .env existente del módulo Laravel.' }
if ((Leer-Variable $apiEnv 'ILIA_ENVIRONMENT') -eq 'production') {
    throw 'Este script es exclusivamente para desarrollo local. No cambia una API de producción.'
}
$claveApi = Leer-Variable $apiEnv 'ILIA_CODE_MODULE_SHARED_SECRET'
$claveModulo = Leer-Variable $moduleEnv 'ILIA_MODULE_SHARED_SECRET'
if ($claveApi -and $claveModulo -and $claveApi -ne $claveModulo) {
    throw 'Las claves de integración existentes son diferentes. Revísalas localmente sin compartirlas.'
}
$claveIntegracion = if ($claveApi) { $claveApi } else { $claveModulo }
if (-not $claveIntegracion) {
    $bytes = New-Object byte[] 32
    $generador = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generador.GetBytes($bytes) } finally { $generador.Dispose() }
    $claveIntegracion = -join ($bytes | ForEach-Object { $_.ToString('x2') })
}
if ($claveIntegracion.Length -lt 32) { throw 'La clave existente debe tener al menos 32 bytes.' }
if ($claveIntegracion -eq (Leer-Variable $apiEnv 'ILIA_JWT_SECRET')) {
    throw 'La clave de integración debe ser diferente de ILIA_JWT_SECRET.'
}
if (-not (Test-Path $apiEnv)) {
    Copy-Item (Join-Path $raizIlia 'apps\api\.env.example') $apiEnv
}
Guardar-Variable $apiEnv 'ILIA_CODE_MODULE_SHARED_SECRET' $claveIntegracion
Guardar-Variable $apiEnv 'ILIA_COOKIE_SECURE' 'false'
Guardar-Variable $moduleEnv 'ILIA_API_URL' 'http://localhost:8000/api/v1'
Guardar-Variable $moduleEnv 'ILIA_MODULE_SHARED_SECRET' $claveIntegracion
Guardar-Variable $moduleEnv 'ILIA_PRACTICE_ENABLED' 'true'
Guardar-Variable $moduleEnv 'ILIA_WEB_ORIGIN' 'http://localhost:8081'
Guardar-Variable $mobileEnv 'EXPO_PUBLIC_API_URL' 'http://localhost:8000'
Guardar-Variable $mobileEnv 'EXPO_PUBLIC_CODE_MODULE_URL' 'http://localhost:8010'
Guardar-Variable $mobileEnv 'EXPO_PUBLIC_CODE_MODULE_AUTH_MODE' 'ilia'

$baseModulo = Join-Path $raizIlia 'apps\entregas-codigo-victor\database\database.sqlite'
$respaldo = Join-Path $raizIlia 'apps\entregas-codigo-victor\database\database.pre-integracion.sqlite'
if ((Test-Path $baseModulo) -and -not (Test-Path $respaldo)) {
    Copy-Item $baseModulo $respaldo
    Write-Host 'Respaldo local de SQLite creado. Conserva este archivo fuera de la entrega.'
}
Write-Host 'Integración local configurada. No se han mostrado contraseñas ni claves.'
Write-Host 'Conserva la conexión persistente de la API oficial; consulta INTEGRACION_ILIA_3_3.md.'
Write-Host 'Ahora ejecuta config:clear, migrate y las pruebas del módulo; reinicia API, Laravel y Expo.'
