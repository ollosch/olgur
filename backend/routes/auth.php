<?php

declare(strict_types=1);

use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\RegistrationController;
use App\Http\Controllers\Auth\TokenController;
use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;

Route::post('/register', RegistrationController::class)
    ->middleware('guest')
    ->name('register');

Route::post('/login', [TokenController::class, 'store'])
    ->middleware('guest')
    ->name('login');

Route::post('/logout', [TokenController::class, 'destroy'])
    ->middleware('auth:sanctum')
    ->name('logout');

Route::get('/verify-email/{id}/{hash}', VerifyEmailController::class)
    ->middleware(['auth:sanctum', 'signed', 'throttle:6,1'])
    ->name('verification.verify');

Route::post('/email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
    ->middleware(['auth:sanctum', 'throttle:6,1'])
    ->name('verification.send');
