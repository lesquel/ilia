<?php

use App\Http\Controllers\CodePracticeController as Practice;
use App\Http\Controllers\AccesoIliaController;
use App\Http\Controllers\NormalizacionEntregaController;
use App\Http\Controllers\ReporteEntregasController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/modulo');
Route::post('/acceso/ilia', [AccesoIliaController::class, 'entrar'])->middleware('throttle:10,1');
Route::get('/acceso/practica', [Practice::class, 'practiceForm']);
Route::post('/acceso/practica', [Practice::class, 'practiceLogin'])->middleware('throttle:10,1');
Route::get('/acceso/csrf', [Practice::class, 'csrf'])->middleware('throttle:60,1');
Route::post('/acceso/login', [Practice::class, 'login'])->middleware('throttle:10,1');

Route::middleware('auth')->group(function () {
    Route::post('/acceso/salir', [Practice::class, 'logout'])->name('module.logout');
    Route::get('/modulo', [Practice::class, 'dashboard'])->name('module.dashboard');
    Route::get('/tareas/{id}', [Practice::class, 'exercise'])->whereNumber('id')->name('module.exercise');
    Route::post('/tareas', [Practice::class, 'createExercise'])->name('module.exercises');
    Route::get('/instructor/tareas/{id}', [Practice::class, 'instructorExercise'])
        ->whereNumber('id')->name('module.instructor.exercise');
    Route::get('/entregas/{id}', [Practice::class, 'review'])->whereNumber('id')->name('module.review');
    Route::post('/api/practica/entregas-codigo', [Practice::class, 'store'])->name('module.submit');
});

// Práctica individual 2.3: traducción de dos orígenes al contrato de entregas.
Route::middleware('auth')->group(function () {
    Route::post('/api/practica/normalizacion-entregas/web',
        [NormalizacionEntregaController::class, 'web']);
    Route::post('/api/practica/normalizacion-entregas/externo',
        [NormalizacionEntregaController::class, 'externo']);
});

// Práctica individual 3.1: reportes con productor, RabbitMQ y consumidor.
Route::middleware('auth')->group(function () {
    Route::post('/api/practica/reportes-entregas', [ReporteEntregasController::class, 'store'])
        ->middleware('throttle:20,1')->name('module.reports.store');
    Route::post('/api/practica/reportes-entregas/sincrono', [ReporteEntregasController::class, 'sincrono'])
        ->middleware('throttle:20,1')->name('module.reports.sync');
    Route::get('/api/practica/tareas/{id}/reportes', [ReporteEntregasController::class, 'index'])
        ->whereNumber('id')->name('module.reports.index');
    Route::get('/api/practica/reportes-entregas/{id}', [ReporteEntregasController::class, 'show'])
        ->whereUuid('id')->name('module.reports.show');
    Route::get('/reportes-entregas/{id}/descargar', [ReporteEntregasController::class, 'descargar'])
        ->whereUuid('id')->name('module.reports.download');
});

// Práctica 3.2: cursos, agenda y enrutamiento de eventos.
Route::middleware('auth')->group(function () {
    Route::get('/api/practica/cursos', [\App\Http\Controllers\AgendaController::class, 'cursos'])->name('module.agenda.courses');
    Route::post('/tareas/{id}/fecha', [\App\Http\Controllers\AgendaController::class, 'fecha'])->whereNumber('id')->name('module.agenda.date');
    Route::post('/api/practica/agenda/eventos', [\App\Http\Controllers\AgendaController::class, 'evento'])->middleware('throttle:30,1');
    Route::get('/api/practica/agenda/eventos/{id}', [\App\Http\Controllers\AgendaController::class, 'show'])->whereUuid('id');
});
