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
     * Return the system manifest: each module's latest released version with
     * cached content URLs that include the snapshot revision as a cache-buster.
     */
    public function __invoke(System $system): JsonResponse
    {
        Gate::authorize('view', $system);

        $modules = $system->modules()
            ->orderBy('sort_order')
            ->get()
            ->map(function (Module $module) use ($system): array {
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
                    'revision' => $latestVersion === null ? 0 : $latestVersion->revision,
                    'content' => $latestVersion !== null ? [
                        'rules' => $this->contentUrl('versions.rules', [$system, $module, $latestVersion], $latestVersion->revision),
                        'index' => $this->contentUrl('versions.index', [$system, $module, $latestVersion], $latestVersion->revision),
                        'game-data' => $this->contentUrl('versions.game-data', [$system, $module, $latestVersion], $latestVersion->revision),
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

    /**
     * @param  array<mixed>  $parameters
     */
    private function contentUrl(string $name, array $parameters, int $revision): string
    {
        $url = route($name, $parameters);

        if ($revision > 0) {
            $url .= '?rev='.$revision;
        }

        return $url;
    }
}
