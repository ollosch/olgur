<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\ActivateModule;
use App\Actions\DeactivateModule;
use App\Models\Module;
use App\Models\System;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class ModuleActivationController
{
    /**
     * Activate an expansion module for the authenticated user.
     */
    public function store(
        Request $request,
        System $system,
        Module $module,
        ActivateModule $activateModule,
    ): JsonResponse {
        /** @var User $user */
        $user = $request->user();

        $membership = $activateModule->execute($user, $module);

        /** @var array<int, string> $activeIds */
        $activeIds = ($membership->config ?? [])['active_module_ids'] ?? [];

        return response()->json([
            'data' => [
                'membership_id' => $membership->id,
                'active_module_ids' => $activeIds,
            ],
        ]);
    }

    /**
     * Deactivate an expansion module for the authenticated user.
     */
    public function destroy(
        Request $request,
        System $system,
        Module $module,
        DeactivateModule $deactivateModule,
    ): Response {
        /** @var User $user */
        $user = $request->user();

        $deactivateModule->execute($user, $module);

        return response()->noContent();
    }
}
