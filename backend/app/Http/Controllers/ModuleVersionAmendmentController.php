<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\ApplyModuleVersionAmendment;
use App\Http\Requests\StoreModuleVersionAmendmentRequest;
use App\Http\Resources\ModuleVersionAmendmentResource;
use App\Models\Module;
use App\Models\ModuleVersion;
use App\Models\System;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

final class ModuleVersionAmendmentController
{
    /**
     * Display a listing of amendments for the given version.
     */
    public function index(System $system, Module $module, ModuleVersion $version): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', ModuleVersion::class);

        return ModuleVersionAmendmentResource::collection(
            $version->amendments()->oldest('amended_at')->get()
        );
    }

    /**
     * Apply an amendment to a released version.
     */
    public function store(
        StoreModuleVersionAmendmentRequest $request,
        System $system,
        Module $module,
        ModuleVersion $version,
        ApplyModuleVersionAmendment $applyAmendment,
    ): ModuleVersionAmendmentResource {
        Gate::authorize('create', [ModuleVersion::class, $module]);

        /** @var User $user */
        $user = $request->user();

        $validated = $request->validated();

        /** @var string $entityType */
        $entityType = $validated['entity_type'];

        /** @var string $entityId */
        $entityId = $validated['entity_id'];

        /** @var string $changeType */
        $changeType = $validated['change_type'];

        /** @var string $description */
        $description = $validated['description'];

        /** @var array<string, mixed> $content */
        $content = $validated['content'];

        $amendment = $applyAmendment->execute(
            $version,
            $user,
            $entityType,
            $entityId,
            $changeType,
            $description,
            $content,
        );

        return new ModuleVersionAmendmentResource($amendment);
    }
}
