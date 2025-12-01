<?php

declare(strict_types=1);

use App\Http\Controllers\ModuleController;
use App\Http\Controllers\RuleController;
use App\Http\Controllers\SystemController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/me', fn (Request $request) => $request->user())
    ->middleware(['auth:sanctum'])
    ->name('me');

Route::group(['middleware' => ['auth:sanctum']], function (): void {
    Route::apiResource('systems', SystemController::class);
    Route::apiResource('systems.modules', ModuleController::class)->scoped();
    Route::apiResource('rules', RuleController::class);
});

require __DIR__.'/auth.php';
