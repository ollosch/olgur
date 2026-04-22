<?php

declare(strict_types=1);

use App\Http\Middleware\RedirectIfAuthenticated;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->remove(ConvertEmptyStringsToNull::class);
        $middleware->redirectGuestsTo(fn () => response()->json(['message' => 'Unauthenticated.'], 401));
        $middleware->alias(['guest' => RedirectIfAuthenticated::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
