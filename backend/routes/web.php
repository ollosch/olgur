<?php

declare(strict_types=1);

use App\Http\Controllers\IndexEntryController;
use App\Http\Controllers\MeController;
use App\Http\Controllers\MembershipController;
use App\Http\Controllers\ModuleActivationController;
use App\Http\Controllers\ModuleController;
use App\Http\Controllers\ModuleVersionController;
use App\Http\Controllers\ModuleVersionFileController;
use App\Http\Controllers\RuleController;
use App\Http\Controllers\RuleImageController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\SystemController;
use App\Http\Controllers\SystemManifestController;
use Illuminate\Support\Facades\Route;

Route::prefix('api')->group(function (): void {
    Route::get('/rules/images/{filename}', [RuleImageController::class, 'show'])
        ->where('filename', '.+');

    Route::middleware('auth')->group(function (): void {
        Route::get('/me', [MeController::class, 'show']);
        Route::patch('/me', [MeController::class, 'update']);
        Route::get('/me/memberships', [MeController::class, 'memberships']);
        Route::get('/me/subscriptions', [MeController::class, 'subscriptions']);
        Route::patch('/me/memberships/{system}', [MeController::class, 'updateMembership']);

        Route::apiResource('systems', SystemController::class);

        Route::scopeBindings()->group(function (): void {
            Route::apiResource('systems.memberships', MembershipController::class)
                ->except(['show']);
            Route::apiResource('systems.modules', ModuleController::class);
            Route::apiResource('systems.modules.subscriptions', SubscriptionController::class)
                ->except(['show']);
            Route::apiResource('systems.modules.rules', RuleController::class);
            Route::apiResource('systems.modules.index-entries', IndexEntryController::class);
            Route::apiResource('systems.modules.versions', ModuleVersionController::class)
                ->only(['index', 'store', 'show']);

            Route::get('/systems/{system}/manifest', SystemManifestController::class);
            Route::post('/systems/{system}/modules/{module}/activate', [ModuleActivationController::class, 'store']);
            Route::delete('/systems/{system}/modules/{module}/activate', [ModuleActivationController::class, 'destroy']);

            Route::get('/systems/{system}/modules/{module}/versions/{version}/rules', [ModuleVersionFileController::class, 'rules'])
                ->name('versions.rules');
            Route::get('/systems/{system}/modules/{module}/versions/{version}/index', [ModuleVersionFileController::class, 'index'])
                ->name('versions.index');
        });
    });

    require __DIR__.'/auth.php';
});
