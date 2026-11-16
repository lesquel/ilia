<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title') · ILIA</title>
    <link rel="stylesheet" href="{{ asset('practica/module.css') }}">
</head>
<body>
    <header class="topbar">
        <div class="container masthead">
            <a class="brand" href="{{ route('module.dashboard') }}">
                <img src="{{ asset('practica/ilia.png') }}" alt="ILIA">
                <span>Ejercicios de código</span>
            </a>
            <form action="{{ route('module.logout') }}" method="POST">
                @csrf
                <button class="secondary" type="submit">Cerrar sesión</button>
            </form>
        </div>
    </header>
    <main class="container">
        @yield('content')
    </main>
</body>
</html>
