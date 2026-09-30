<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\ApplyModuleVersionBackEdit;
use App\Actions\PublishModuleVersion;
use App\Http\Requests\AmendModuleVersionRequest;
use App\Http\Requests\StoreModuleVersionRequest;
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
                ->with('releaseNotes')
                ->get()
        );
    }

    /**
     * Store a newly created version in storage.
     */
    public function store(
        StoreModuleVersionRequest $request,
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

        /** @var string $notes */
        $notes = $validated['notes'] ?? '';

        /** @var int $expectedDraftRevision */
        $expectedDraftRevision = $validated['expected_draft_revision'];

        /** @var array<int, array{entity_type: string, entity_id: string, note: string}> $releaseNotes */
        $releaseNotes = $validated['release_notes'];

        $moduleVersion = $publishModuleVersion->execute(
            $module,
            $user,
            $versionString,
            $notes,
            $expectedDraftRevision,
            $releaseNotes,
        );

        $moduleVersion->load('releaseNotes');

        return new ModuleVersionResource($moduleVersion);
    }

    /**
     * Apply a constrained, latest-only back-edit to a single snapshot record.
     */
    public function amend(
        AmendModuleVersionRequest $request,
        System $system,
        Module $module,
        ModuleVersion $version,
        ApplyModuleVersionBackEdit $applyBackEdit,
    ): ModuleVersionResource {
        Gate::authorize('amendLatest', [ModuleVersion::class, $module]);

        $validated = $request->validated();

        /** @var string $entityType */
        $entityType = $validated['entity_type'];

        /** @var string $entityId */
        $entityId = $validated['entity_id'];

        /** @var int $expectedRevision */
        $expectedRevision = $validated['expected_revision'];

        /** @var array<string, mixed> $content */
        $content = $validated['content'];

        $moduleVersion = $applyBackEdit->execute(
            $module,
            $version,
            $entityType,
            $entityId,
            $expectedRevision,
            $content,
        );

        return new ModuleVersionResource($moduleVersion);
    }
}
