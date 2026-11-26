@extends('layout')
@section('title', 'Mi espacio')
@section('content')
<link rel="stylesheet" href="{{ asset('practica/agenda.css') }}">
<section class="student-welcome"><h1>Mi espacio</h1><p>{{ $studentName }}</p></section>
<section class="card agenda-panel" aria-labelledby="tasks-heading">
    <div class="row"><div><p class="agenda-kicker">ORGANIZA TU APRENDIZAJE</p><h2 id="tasks-heading">Mis tareas · Línea de tiempo</h2></div>
        <a class="secondary" href="{{ request()->fullUrl() }}">Actualizar</a></div>
    <p class="hint">Consulta tus próximos deberes y continúa donde lo dejaste. Horario de Ecuador continental.</p>
    <form action="{{ route('module.dashboard') }}" method="GET" class="agenda-filters">
        <label>Mostrar<select name="estado">
            @foreach (['todos'=>'Todos', 'atrasados'=>'Atrasados', 'proximos'=>'Próximos 7 días', 'entregadas'=>'Completadas'] as $value=>$label)
                <option value="{{ $value }}" @selected(request('estado', 'todos') === $value)>{{ $label }}</option>
            @endforeach
        </select></label>
        <label>Ordenar<select name="orden">
            <option value="fecha" @selected(request('orden', 'fecha') === 'fecha')>Por fecha</option>
            <option value="curso" @selected(request('orden') === 'curso')>Por curso</option>
        </select></label>
        <label class="agenda-search">Buscar<input name="q" type="search" maxlength="120" value="{{ request('q') }}" placeholder="Nombre de tarea o curso"></label>
        <button type="submit">Aplicar</button><a class="agenda-clear" href="{{ route('module.dashboard') }}">Limpiar</a>
    </form>
    @forelse ($exercises as $exercise)
        @php($date = $exercise->timeline_due_at ? \Carbon\CarbonImmutable::parse($exercise->timeline_due_at, 'UTC')->setTimezone(config('agenda.timezone')) : null)
        <article class="agenda-row">
            <div class="agenda-date" aria-label="Fecha límite">
                <strong>{{ $date?->format('d') ?? '—' }}</strong>
                <span>{{ $date?->locale('es')->isoFormat('MMM') ?? 'Sin fecha' }}</span>
            </div>
            <div class="agenda-copy">
                <p class="agenda-course">{{ $exercise->course_title ?? 'Sin curso asignado · Tarea anterior' }}</p>
                <h3>{{ $exercise->title }}</h3>
                <p class="hint">{{ $date ? 'Vence: '.$date->format('d/m/Y · H:i') : 'Sin fecha de vencimiento' }} · {{ ucfirst($exercise->language) }}</p>
                <span @class(['agenda-badge', 'agenda-done'=>$exercise->entregada, 'agenda-late'=>$exercise->atrasada])>
                    {{ $exercise->entregada ? 'Entregada' : ($exercise->atrasada ? 'Atrasada' : 'Pendiente') }}
                </span>
                @if (! $exercise->entregada && $exercise->submission_count > 0)
                    <p class="hint">Entrega recibida. La agenda está actualizándose.</p>
                @endif
            </div>
            <a class="secondary agenda-open" href="{{ route('module.exercise', $exercise->id) }}">Abrir tarea →</a>
        </article>
    @empty
        <div class="agenda-empty"><h3>No hay tareas para mostrar</h3>
            <p>Todavía no hay tareas disponibles con estos filtros. Las nuevas tareas aparecen cuando se procesa su publicación.</p>
            @if (auth()->user()->ilia_user_id)
                <p>Para ver tareas de un curso oficial, inscríbete en él desde el catálogo de ILIA.</p>
                <a class="secondary" href="{{ rtrim(config('practica.ilia_origin'), '/') }}">Ir a ILIA</a>
            @endif
        </div>
    @endforelse
</section>
@endsection
