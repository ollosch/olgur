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
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

final class ModuleVersionController
{
    /**
     * Display a listing of released versions for the given module.
     */
    public function index(
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
        Gate::authorize('create', [ModuleVersion::class, $module]);

        /** @var User $user */
        $user = $request->user();

        $validated = $request->validated();

        /** @var string $versionString */
        $versionString = $validated['version_string'];

        /** @var string|null $notes */
        $notes = $validated['notes'] ?? null;

        $moduleVersion = $publishModuleVersion->execute(
            $module,
            $user,
            $versionString,
            $notes,
        );

        return new ModuleVersionResource($moduleVersion);
    }
}
