@extends('layout')
@section('title', 'Revisar historial')
@section('content')
    <a class="back" href="{{ route('module.instructor.exercise', $submission->exercise_id) }}">← Volver a entregas</a>
    <h1>{{ $submission->title }}</h1>
    <p>{{ $submission->name }} · Entrega #{{ $submission->id }}</p>
    <dl class="metrics">
        <div><dt>Pasos registrados</dt><dd>{{ $summary['step_count'] }}</dd></div>
        <div><dt>Pegados observados</dt><dd>{{ $summary['paste_count'] }}</dd></div>
        <div><dt>Mayor pegado</dt><dd>{{ $summary['largest_paste_chars'] }} caracteres</dd></div>
        <div><dt>Uso de IA declarado</dt><dd>{{ ['none' => 'Ninguno', 'consultation' => 'Consulta', 'generation' => 'Generación de código'][$submission->ai_usage] }}</dd></div>
    </dl>
    <section class="card">
        <div class="row">
            <h2>Historial de edición</h2>
            <div class="row controls">
                <button type="button" class="secondary" id="previous">← Anterior</button>
                <span id="position" aria-live="polite"></span>
                <button type="button" class="secondary" id="next">Siguiente →</button>
            </div>
        </div>
        <p id="change-type"></p>
        <div class="compare">
            <div><h3>Versión anterior</h3><pre id="before-code" tabindex="0"></pre></div>
            <div><h3>Versión de este paso</h3><pre id="current-code" tabindex="0"></pre></div>
        </div>
        <p class="hint">El historial registra cambios reportados por el editor. Los pegados pueden provenir de diferentes fuentes.</p>
    </section>
    <script id="history" type="application/json">{!! json_encode($history, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR) !!}</script>
    <script src="{{ asset('practica/review.js') }}" defer></script>
@endsection
