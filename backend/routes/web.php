<?php

declare(strict_types=1);

use App\Http\Controllers\MembershipController;
use App\Http\Controllers\ModuleController;
use App\Http\Controllers\SystemController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('api')->group(function (): void {
    Route::middleware('auth')->group(function (): void {
        Route::get('/me', fn (Request $request) => $request->user());

        Route::apiResource('systems', SystemController::class);
        Route::apiResource('systems.modules', ModuleController::class)->scoped();
        Route::apiResource('systems.memberships', MembershipController::class)->scoped()->except(['show']);
    });

    require __DIR__.'/auth.php';
});
