<?php

use App\Http\Controllers\CodePracticeController as Practice;
use App\Http\Controllers\NormalizacionEntregaController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/modulo');
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
