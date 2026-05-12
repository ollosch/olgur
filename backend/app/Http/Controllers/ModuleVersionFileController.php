<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Module;
use App\Models\ModuleVersion;
use App\Models\System;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

final class ModuleVersionFileController
{
    /**
     * Serve the rules JSON file for a released module version.
     */
    public function rules(System $system, Module $module, ModuleVersion $version): JsonResponse
    {
        Gate::authorize('viewAny', ModuleVersion::class);

        abort_if($version->module_id !== $module->id, 404);

        $path = sprintf('versions/%s/rules.json', $version->id);

        abort_unless(Storage::disk('local')->exists($path), 404);

        /** @var string $content */
        $content = Storage::disk('local')->get($path);

        return response()->json(json_decode($content, true));
    }

    /**
     * Serve the index JSON file for a released module version.
     */
    public function index(System $system, Module $module, ModuleVersion $version): JsonResponse
    {
        Gate::authorize('viewAny', ModuleVersion::class);

        abort_if($version->module_id !== $module->id, 404);

        $path = sprintf('versions/%s/index.json', $version->id);

        abort_unless(Storage::disk('local')->exists($path), 404);

        /** @var string $content */
        $content = Storage::disk('local')->get($path);

        return response()->json(json_decode($content, true));
    }

    /**
     * Serve the game data JSON file for a released module version.
     */
    public function gameData(System $system, Module $module, ModuleVersion $version): JsonResponse
    {
        Gate::authorize('viewAny', ModuleVersion::class);

        abort_if($version->module_id !== $module->id, 404);

        $path = sprintf('versions/%s/game-data.json', $version->id);

        abort_unless(Storage::disk('local')->exists($path), 404);

        /** @var string $content */
        $content = Storage::disk('local')->get($path);

        return response()->json(json_decode($content, true));
    }
}
