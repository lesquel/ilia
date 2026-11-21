<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [\App\Http\Middleware\ValidarIdentidadIlia::class]);
        $middleware->redirectGuestsTo(fn () => rtrim(config('practica.ilia_origin'), '/').'/login');
        $middleware->trimStrings(except: ['code', 'history.*.code']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\App\Exceptions\IdentidadIliaException $error, $request) {
            if ($request->expectsJson() || $request->is('api/*', 'acceso/*')) {
                return response()->json(['message' => $error->getMessage()], $error->status)
                    ->header('Cache-Control', 'no-store');
            }

            return response()->view('ilia-unavailable', ['message' => $error->getMessage()], $error->status)
                ->header('Cache-Control', 'no-store');
        });
        $exceptions->shouldRenderJsonWhen(
            fn ($request, $exception) => $request->is('api/*', 'acceso/*') || $request->expectsJson()
        );
    })->create();
