@extends('layout')
@section('title', 'Resolver tarea')
@section('content')
    <a class="back" href="{{ route('module.dashboard') }}">← Volver a mis tareas</a>
    <h1>{{ $exercise->title }}</h1>
    <p>{{ $exercise->course_title ?? 'Sin curso asignado' }}
        @if ($exercise->due_at) · Vence: {{ \Carbon\CarbonImmutable::parse($exercise->due_at, 'UTC')->setTimezone(config('agenda.timezone'))->format('d/m/Y H:i') }} @endif
    </p>
    <section class="card">
        <div class="row">
            <h2>Consigna</h2>
            <span class="tag">{{ $exercise->language }}</span>
        </div>
        <p class="preserve">{{ $exercise->instructions }}</p>
        <form class="editor" action="{{ route('module.submit') }}" method="POST"
              data-exercise="{{ $exercise->id }}" data-language="{{ $exercise->language }}">
            <label for="code-{{ $exercise->id }}">Código</label>
            <textarea class="code-input" id="code-{{ $exercise->id }}" name="code"
                      required maxlength="10000" spellcheck="false" rows="13"></textarea>
            <div class="row">
                <p class="hint" data-steps>0 pasos · 0 pegados</p>
                <p class="hint">El editor registra versiones del código y detecta los pegados dentro de esta área.</p>
            </div>
            <label for="ai-{{ $exercise->id }}">¿Cómo usaste IA?</label>
            <select id="ai-{{ $exercise->id }}" name="ai_usage" required>
                <option value="">Selecciona una opción</option>
                <option value="none">No utilicé IA</option>
                <option value="consultation">Consulté dudas</option>
                <option value="generation">Usé IA para generar código</option>
            </select>
            <div class="row actions">
                <button type="submit">Entregar código</button>
                <p role="status" data-result></p>
            </div>
        </form>
    </section>
    <script src="{{ asset('practica/editor.js') }}" defer></script>
@endsection
