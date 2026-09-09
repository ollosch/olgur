<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Module;
use App\Models\ModuleVersion;
use App\Models\System;
use App\Services\ModuleVersionContent;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;

final readonly class ModuleVersionContentController
{
    public function __construct(private ModuleVersionContent $content) {}

    /**
     * Serve the released rules snapshot for a module version.
     */
    public function rules(System $system, Module $module, ModuleVersion $version): JsonResponse
    {
        Gate::authorize('viewReleased', [ModuleVersion::class, $module, $version]);

        $this->assertVersionBelongsToModule($module, $version);

        return response()->json($this->cached($version, 'rules', fn (): array => $this->content->rules($version)));
    }

    /**
     * Serve the released index snapshot for a module version.
     */
    public function index(System $system, Module $module, ModuleVersion $version): JsonResponse
    {
        Gate::authorize('viewReleased', [ModuleVersion::class, $module, $version]);

        $this->assertVersionBelongsToModule($module, $version);

        return response()->json($this->cached($version, 'index', fn (): array => $this->content->index($version)));
    }

    /**
     * Serve the released game-data snapshot for a module version.
     */
    public function gameData(System $system, Module $module, ModuleVersion $version): JsonResponse
    {
        Gate::authorize('viewReleased', [ModuleVersion::class, $module, $version]);

        $this->assertVersionBelongsToModule($module, $version);

        return response()->json($this->cached($version, 'game-data', fn (): array => $this->content->gameData($version)));
    }

    private function assertVersionBelongsToModule(Module $module, ModuleVersion $version): void
    {
        abort_if($version->module_id !== $module->id, 404);
    }

    /**
     * @param  Closure(): array<int, array<string, mixed>>  $resolver
     * @return array<int, array<string, mixed>>
     */
    private function cached(ModuleVersion $version, string $kind, Closure $resolver): array
    {
        $key = sprintf('version-content:%s:%d:%s', $version->id, $version->revision, $kind);

        /** @var array<int, array<string, mixed>> $payload */
        $payload = Cache::rememberForever($key, $resolver);

        return $payload;
    }
}
