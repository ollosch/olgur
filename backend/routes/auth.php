<?php

declare(strict_types=1);

use App\Http\Controllers\Auth\TokenController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [TokenController::class, 'store'])
    ->middleware('guest')
    ->name('login');

Route::post('/logout', [TokenController::class, 'destroy'])
    ->middleware('auth:sanctum')
    ->name('logout');
