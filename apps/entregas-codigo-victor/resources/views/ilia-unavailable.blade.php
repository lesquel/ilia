<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Acceso al módulo · ILIA</title><link rel="stylesheet" href="{{ asset('practica/module.css') }}"></head>
<body><main class="container"><section class="card">
<h1>No pudimos continuar</h1><p role="alert">{{ $message }}</p>
<a class="secondary" href="{{ rtrim(config('practica.ilia_origin'), '/') }}">Volver a ILIA</a>
</section></main></body></html>
