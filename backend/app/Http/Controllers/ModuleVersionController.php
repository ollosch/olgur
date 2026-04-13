<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\PublishModuleVersion;
use App\Http\Requests\CreateModuleVersionRequest;
use App\Http\Resources\ModuleVersionResource;
use App\Models\Module;
use App\Models\ModuleVersion;
use App\Models\System;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

final class ModuleVersionController
{
    /**
     * Display a listing of released versions for the given module.
     */
    public function index(
        Request $request,
        System $system,
        Module $module
    ): AnonymousResourceCollection {
        Gate::authorize('viewAny', ModuleVersion::class);

        return ModuleVersionResource::collection(
            ModuleVersion::query()
                ->where('module_id', $module->id)
                ->whereNotNull('released_at')
                ->latest('released_at')
                ->get()
        );
    }

    /**
     * Store a newly created version in storage.
     */
    public function store(
        CreateModuleVersionRequest $request,
        System $system,
        Module $module,
        PublishModuleVersion $publishModuleVersion
    ): ModuleVersionResource {
        Gate::authorize('create', ModuleVersion::class);

        /** @var User $user */
        $user = $request->user();

        $moduleVersion = $publishModuleVersion->execute(
            $module,
            $user,
            $request->string('version_string')->toString(),
            $request->string('notes')->toString()
        );

        return new ModuleVersionResource($moduleVersion);
    }

    /**
     * Display the specified version with its reconstructed snapshot.
     */
    public function show(
        Request $request,
        System $system,
        Module $module,
        ModuleVersion $version
    ): JsonResponse {
        Gate::authorize('show', $version);

        abort_if($version->module_id !== $module->id, 404);

        return response()->json([
            'version' => new ModuleVersionResource($version),
            'rules' => $version->ruleVersions->toArray(),
            'index_entries' => $version->indexEntryVersions->toArray(),
        ]);
    }
}
