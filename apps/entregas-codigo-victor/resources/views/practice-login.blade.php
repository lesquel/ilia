<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Acceso de práctica · ILIA</title><link rel="stylesheet" href="{{ asset('practica/module.css') }}"></head>
<body><main class="container"><section class="card">
<h1>Acceso de práctica</h1><p>Usa las cuentas locales configuradas para las prácticas anteriores.</p>
@if ($errors->any())<p role="alert">{{ $errors->first() }}</p>@endif
<form method="POST" action="{{ url('/acceso/practica') }}">
@csrf
<label for="email">Correo</label><input id="email" name="email" type="email" required autocomplete="username">
<label for="password">Contraseña</label><input id="password" name="password" type="password" required autocomplete="current-password">
<button type="submit">Entrar a la práctica</button>
</form></section></main></body></html>
