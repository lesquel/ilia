@extends('layout')
@section('title', $exercise->title)
@section('content')
    <a class="back" href="{{ route('module.dashboard') }}">← Volver a mis tareas</a>
    <div class="row">
        <h1>{{ $exercise->title }}</h1>
        <span class="tag">{{ ['python' => 'Python', 'javascript' => 'JavaScript', 'php' => 'PHP'][$exercise->language] }}</span>
    </div>

    <section class="card" aria-labelledby="instructions-heading">
        <h2 id="instructions-heading">Consigna</h2>
        <p class="preserve">{{ $exercise->instructions }}</p>
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
@endsection
