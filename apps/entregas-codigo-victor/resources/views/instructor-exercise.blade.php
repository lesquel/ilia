@extends('layout')
@section('title', $exercise->title)
@section('content')
    <link rel="stylesheet" href="{{ asset('practica/reportes.css') }}">
    <a class="back" href="{{ route('module.dashboard') }}">← Volver a mis tareas</a>
    <div class="row">
        <h1>{{ $exercise->title }}</h1>
        <span class="tag">{{ ['python' => 'Python', 'javascript' => 'JavaScript', 'php' => 'PHP'][$exercise->language] }}</span>
    </div>

    <section class="card" aria-labelledby="instructions-heading">
        <h2 id="instructions-heading">Consigna</h2>
        <p class="preserve">{{ $exercise->instructions }}</p>
    </section>


    <link rel="stylesheet" href="{{ asset('practica/agenda.css') }}">
    @if (session('success'))<p class="notice" role="status">{{ session('success') }}</p>@endif
    @if ($errors->any())<p class="notice error" role="alert">{{ $errors->first() }}</p>@endif
    <section class="card">
        <h2>Curso y vencimiento</h2><p>{{ $exercise->course_title ?? 'Sin curso asignado · Tarea anterior' }}</p>
        <form method="POST" action="{{ route('module.agenda.date', $exercise->id) }}" class="agenda-deadline-form">
            @csrf<label>Fecha límite · Ecuador
                <input type="datetime-local" name="due_at" value="{{ $exercise->due_at ? \Carbon\CarbonImmutable::parse($exercise->due_at, 'UTC')->setTimezone(config('agenda.timezone'))->format('Y-m-d\TH:i') : '' }}">
            </label><button type="submit">Guardar fecha</button>
        </form><p class="hint">Deja la fecha vacía para quitar el vencimiento. Los cambios se distribuyen a la agenda.</p>
    </section>
    <section class="card" aria-labelledby="submissions-heading">
        <h2 id="submissions-heading">Entregas recibidas</h2>
        @forelse ($submissions as $submission)
            <article class="row item">
                <div>
                    <h3>{{ $submission->name }}</h3>
                    <p>Entrega #{{ $submission->id }}</p>
                </div>
                <a class="secondary" href="{{ route('module.review', $submission->id) }}">Revisar historial</a>
            </article>
        @empty
            <p>Todavía no hay entregas para esta tarea.</p>
        @endforelse
    </section>
    <section class="card reports-card" aria-labelledby="reports-heading"
        id="reportes-panel" data-exercise-id="{{ $exercise->id }}"
        data-create-url="{{ route('module.reports.store') }}"
        data-list-url="{{ route('module.reports.index', $exercise->id) }}">
        <div class="row">
            <div>
                <h2 id="reports-heading">Reportes de entregas</h2>
                <p>Descarga un resumen de las entregas de esta tarea para revisarlo en Excel.</p>
            </div>
            <button type="button" id="generar-reporte">Generar reporte</button>
        </div>
        <p class="hint">Incluye una fila por entrega: estudiante, fecha, versiones, pegados y uso de IA declarado.
            El reporte se prepara en segundo plano; puedes seguir revisando los trabajos.</p>
        <p id="reportes-mensaje" role="status" aria-live="polite"></p>
        <div class="row">
            <h3>Reportes recientes</h3>
            <button type="button" class="secondary" id="actualizar-reportes">Actualizar</button>
        </div>
        <ul id="reportes-lista" class="reports-list" aria-label="Reportes recientes">
            <li class="hint">Cargando reportes…</li>
        </ul>
    </section>
    <script src="{{ asset('practica/reportes.js') }}" defer></script>
@endsection
