<?php

declare(strict_types=1);

use App\Http\Controllers\IndexEntryController;
use App\Http\Controllers\MembershipController;
use App\Http\Controllers\ModuleActivationController;
use App\Http\Controllers\ModuleController;
use App\Http\Controllers\ModuleVersionController;
use App\Http\Controllers\RuleController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\SystemController;
use App\Http\Controllers\SystemManifestController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('api')->group(function (): void {
    Route::middleware('auth')->group(function (): void {
        Route::get('/me', fn (Request $request) => $request->user());
        Route::get('/me/subscriptions', [SubscriptionController::class, 'index']);

        Route::apiResource('systems', SystemController::class);
        Route::apiResource('systems.memberships', MembershipController::class)->scoped()->except(['show']);
        Route::apiResource('systems.modules', ModuleController::class)->scoped();
        Route::apiResource('systems.modules.subscriptions', SubscriptionController::class)->scoped()->except(['show']);
        Route::apiResource('systems.modules.rules', RuleController::class)->scoped();
        Route::apiResource('systems.modules.index-entries', IndexEntryController::class)->scoped();
        Route::apiResource('systems.modules.versions', ModuleVersionController::class)->scoped()->except(['update', 'destroy']);

        Route::get('/systems/{system}/manifest', SystemManifestController::class);
        Route::post('/systems/{system}/modules/{module}/activate', [ModuleActivationController::class, 'store']);
        Route::delete('/systems/{system}/modules/{module}/activate', [ModuleActivationController::class, 'destroy']);
    });

    require __DIR__.'/auth.php';
});
