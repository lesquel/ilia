@extends('layout')
@section('title', 'Mi espacio')
@section('content')
    <section class="student-welcome">
        <h1>Mi espacio</h1>
        <p>{{ $studentName }}</p>
    </section>

    <section class="student-tasks" aria-labelledby="tasks-heading">
        <h2 id="tasks-heading">Mis tareas</h2>

        @if ($exercises->isEmpty())
            <p class="card">Todavía no hay tareas disponibles.</p>
        @else
            <ul class="student-task-grid">
                @foreach ($exercises as $exercise)
                    <li>
                        <a class="card student-task" href="{{ route('module.exercise', $exercise->id) }}">
                            <div class="row">
                                <span class="tag">{{ ['python' => 'Python', 'javascript' => 'JavaScript', 'php' => 'PHP'][$exercise->language] }}</span>
                                <span @class(['task-status', 'task-status-done' => $exercise->submission_count > 0])>
                                    {{ $exercise->submission_count > 0 ? 'Entregada' : 'Pendiente' }}
                                </span>
                            </div>
                            <h3>{{ $exercise->title }}</h3>
                            <p>{{ str($exercise->instructions)->limit(130) }}</p>
                            <span class="student-task-link">Abrir tarea <span aria-hidden="true">→</span></span>
                        </a>
                    </li>
                @endforeach
            </ul>
        @endif
    </section>
@endsection
