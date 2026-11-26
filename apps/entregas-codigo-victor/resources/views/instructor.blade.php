@extends('layout')
@section('title', 'Mi espacio')
@section('content')
<link rel="stylesheet" href="{{ asset('practica/agenda.css') }}">
<section class="student-welcome"><h1>Mi espacio</h1><p>{{ $instructorName }}</p></section>
@if (session('success'))<p class="notice" role="status">{{ session('success') }}</p>@endif
@if ($errors->any())<p class="notice error" role="alert">{{ $errors->first() }}</p>@endif
<section aria-labelledby="instructor-tasks-heading">
    <div class="row agenda-heading"><div><p class="agenda-kicker">ENSEÑA Y DA SEGUIMIENTO</p><h2 id="instructor-tasks-heading">Mis tareas</h2></div>
        <button type="button" data-open-task>+ Agregar tarea</button></div>
    @if ($exercises->isEmpty())<p class="card">Todavía no has creado tareas.</p>
    @else
        <ul class="student-task-grid">
            @foreach ($exercises as $exercise)
                <li><a class="card student-task" href="{{ route('module.instructor.exercise', $exercise->id) }}">
                    <div class="row"><span class="tag">{{ ucfirst($exercise->language) }}</span>
                        <span class="hint">{{ $exercise->submission_count }} {{ $exercise->submission_count == 1 ? 'entrega' : 'entregas' }}</span></div>
                    <p class="agenda-course">{{ $exercise->course_title ?? 'Sin curso asignado' }}</p>
                    <h3>{{ $exercise->title }}</h3><p>{{ str($exercise->instructions)->limit(130) }}</p>
                    <p class="hint">{{ $exercise->due_at ? 'Vence: '.\Carbon\CarbonImmutable::parse($exercise->due_at, 'UTC')->setTimezone(config('agenda.timezone'))->format('d/m/Y H:i') : 'Sin fecha límite' }}</p>
                    <span class="student-task-link">Ver tarea →</span>
                </a></li>
            @endforeach
        </ul>
    @endif
</section>
<dialog class="agenda-dialog" data-task-dialog @if($errors->any()) data-reopen @endif>
    <div class="row"><div><p class="agenda-kicker">NUEVA ACTIVIDAD</p><h2>Nueva tarea</h2></div><button type="button" class="secondary" data-close-task aria-label="Cerrar formulario">Cerrar</button></div>
    <p class="hint">Elige el curso y define el vencimiento para la agenda del estudiante.</p>
    <form action="{{ route('module.exercises') }}" method="POST" class="task-form" data-task-form>
        @csrf<input type="hidden" name="agenda_form" value="1">
        <label for="ilia-course">Curso</label>
        @if (auth()->user()->ilia_user_id)
            <select id="ilia-course" name="ilia_course_id" required data-courses-url="{{ route('module.agenda.courses') }}" data-selected="{{ old('ilia_course_id') }}">
                <option value="">Cargando cursos oficiales…</option>
            </select>
            <p class="hint" data-courses-message role="status"></p>
            <a href="{{ rtrim(config('practica.ilia_origin'), '/') }}/instructor" target="_blank" rel="noopener">Gestionar cursos en ILIA</a>
        @else
            <p class="hint">Acceso de práctica: tarea sin vinculación a un curso oficial.</p>
        @endif
        <label for="title">Título</label><input id="title" name="title" required maxlength="150" value="{{ old('title') }}">
        <label for="instructions">Consigna</label><textarea id="instructions" name="instructions" required maxlength="4000" rows="4">{{ old('instructions') }}</textarea>
        <div class="agenda-form-columns"><div><label for="language">Lenguaje</label>
            <select id="language" name="language">@foreach (['python'=>'Python','javascript'=>'JavaScript','php'=>'PHP'] as $key=>$name)
                <option value="{{ $key }}" @selected(old('language') === $key)>{{ $name }}</option>@endforeach</select></div>
            <div><label for="due_at">Fecha límite · Ecuador</label><input id="due_at" name="due_at" type="datetime-local" required value="{{ old('due_at') }}"></div></div>
        <p class="hint">Al guardar se enviará la publicación a la agenda en segundo plano.</p>
        <div class="row"><button type="button" class="secondary" data-close-task>Cancelar</button><button type="submit" data-create-task>Crear tarea</button></div>
    </form>
</dialog>
<script src="{{ asset('practica/agenda.js') }}" defer></script>
@endsection
