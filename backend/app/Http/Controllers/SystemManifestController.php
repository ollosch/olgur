<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Module;
use App\Models\ModuleVersion;
use App\Models\System;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

final class SystemManifestController
{
    /**
     * Return the system manifest: each module's latest released version with file paths.
     */
    public function __invoke(System $system): JsonResponse
    {
        Gate::authorize('view', $system);

        $modules = $system->modules()
            ->orderBy('sort_order')
            ->get()
            ->map(function (Module $module): array {
                /** @var ModuleVersion|null $latestVersion */
                $latestVersion = ModuleVersion::query()
                    ->where('module_id', $module->id)
                    ->whereNotNull('released_at')
                    ->latest('released_at')
                    ->first();

                return [
                    'module_id' => $module->id,
                    'module_name' => $module->name,
                    'slug' => $module->slug,
                    'type' => $module->is_core ? 'core' : 'expansion',
                    'version_id' => $latestVersion?->id,
                    'version_string' => $latestVersion?->version_string,
                    'released_at' => $latestVersion?->released_at?->toIso8601String(),
                    'files' => $latestVersion !== null ? [
                        'rules' => sprintf('versions/%s/rules.json', $latestVersion->id),
                        'index' => sprintf('versions/%s/index.json', $latestVersion->id),
                    ] : null,
                ];
            })
            ->all();

        return response()->json([
            'data' => [
                'system_id' => $system->id,
                'name' => $system->name,
                'modules' => $modules,
            ],
        ]);
    }
}
