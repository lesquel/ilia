@extends('layout')
@section('title', 'Mi espacio')
@section('content')
    <section class="student-welcome">
        <h1>Mi espacio</h1>
        <p>{{ $instructorName }}</p>
    </section>
    @if (session('success'))
        <p class="notice" role="status">{{ session('success') }}</p>
    @endif
    @if ($errors->any())
        <p class="notice error" role="alert">{{ $errors->first() }}</p>
    @endif
    <div class="columns">
        <section aria-labelledby="instructor-tasks-heading">
            <h2 id="instructor-tasks-heading">Mis tareas</h2>
            @if ($exercises->isEmpty())
                <p class="card">Todavía no has creado tareas.</p>
            @else
                <ul class="student-task-grid">
                    @foreach ($exercises as $exercise)
                        <li>
                            <a class="card student-task" href="{{ route('module.instructor.exercise', $exercise->id) }}">
                                <div class="row">
                                    <span class="tag">{{ ['python' => 'Python', 'javascript' => 'JavaScript', 'php' => 'PHP'][$exercise->language] }}</span>
                                    <span class="hint">{{ $exercise->submission_count }} {{ $exercise->submission_count == 1 ? 'entrega' : 'entregas' }}</span>
                                </div>
                                <h3>{{ $exercise->title }}</h3>
                                <p>{{ str($exercise->instructions)->limit(130) }}</p>
                                <span class="student-task-link">Ver tarea <span aria-hidden="true">→</span></span>
                            </a>
                        </li>
                    @endforeach
                </ul>
            @endif
        </section>
        <section class="card">
            <h2>Nueva tarea</h2>
            <form action="{{ route('module.exercises') }}" method="POST" class="task-form">
                @csrf
                <label for="title">Título</label>
                <input id="title" name="title" required maxlength="150" value="{{ old('title') }}">
                <label for="instructions">Consigna</label>
                <textarea id="instructions" name="instructions" required maxlength="4000" rows="4">{{ old('instructions') }}</textarea>
                <label for="language">Lenguaje</label>
                <select id="language" name="language">
                    <option value="python" @selected(old('language') === 'python')>Python</option>
                    <option value="javascript" @selected(old('language') === 'javascript')>JavaScript</option>
                    <option value="php" @selected(old('language') === 'php')>PHP</option>
                </select>
                <button type="submit">Crear tarea</button>
            </form>
        </section>
    </div>
@endsection
