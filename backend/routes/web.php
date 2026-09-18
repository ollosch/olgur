<?php

declare(strict_types=1);

use App\Http\Controllers\GameDatumController;
use App\Http\Controllers\IndexEntryController;
use App\Http\Controllers\MeController;
use App\Http\Controllers\MembershipController;
use App\Http\Controllers\ModuleController;
use App\Http\Controllers\ModuleDraftChangeController;
use App\Http\Controllers\ModuleVersionContentController;
use App\Http\Controllers\ModuleVersionController;
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
            Route::post('/systems/{system}/modules/{module}/rules/{rule}/renumber', [RuleController::class, 'renumber'])
                ->name('rules.renumber');
            Route::apiResource('systems.modules.index-entries', IndexEntryController::class);
            Route::apiResource('systems.modules.game-data', GameDatumController::class);
            Route::apiResource('systems.modules.versions', ModuleVersionController::class)
                ->only(['index', 'store', 'show']);

            Route::get('/systems/{system}/manifest', SystemManifestController::class);

            Route::get('/systems/{system}/modules/{module}/versions/{version}/rules', [ModuleVersionContentController::class, 'rules'])
                ->name('versions.rules');
            Route::get('/systems/{system}/modules/{module}/versions/{version}/index', [ModuleVersionContentController::class, 'index'])
                ->name('versions.index');
            Route::get('/systems/{system}/modules/{module}/versions/{version}/game-data', [ModuleVersionContentController::class, 'gameData'])
                ->name('versions.game-data');
            Route::patch('/systems/{system}/modules/{module}/versions/{version}/amend', [ModuleVersionController::class, 'amend'])
                ->name('versions.amend');

            Route::get('/systems/{system}/modules/{module}/draft-changes', [ModuleDraftChangeController::class, 'index'])
                ->name('draft-changes.index');
            Route::patch('/systems/{system}/modules/{module}/draft-changes/{draftChange}', [ModuleDraftChangeController::class, 'reclassify'])
                ->name('draft-changes.reclassify');
        });
    });

    require __DIR__.'/auth.php';
});
