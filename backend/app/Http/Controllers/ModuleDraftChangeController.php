<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\DraftChangeClassification;
use App\Http\Requests\ReclassifyModuleDraftChangeRequest;
use App\Http\Resources\ModuleDraftChangeResource;
use App\Models\Module;
use App\Models\ModuleDraftChange;
use App\Models\System;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

final class ModuleDraftChangeController
{
    /**
     * Display a listing of draft changes for the given module.
     */
    public function index(Request $request, System $system, Module $module): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [ModuleDraftChange::class, $system, $module]);

        $changes = $module->draftChanges()->oldest('changed_at');

        if ($request->boolean('pending')) {
            $changes->whereNull('module_version_id');
        }

        return ModuleDraftChangeResource::collection($changes->get())
            ->additional(['draft_revision' => $module->draft_revision]);
    }

    /**
     * Reclassify a pending draft change before publishing.
     */
    public function reclassify(
        ReclassifyModuleDraftChangeRequest $request,
        System $system,
        Module $module,
        ModuleDraftChange $draftChange,
    ): ModuleDraftChangeResource {
        Gate::authorize('update', [ModuleDraftChange::class, $system, $module]);

        abort_if($draftChange->module_id !== $module->id, 404);
        abort_if($draftChange->module_version_id !== null, 409, 'Published draft changes cannot be reclassified.');

        /** @var string $classificationValue */
        $classificationValue = $request->validated('classification');

        $draftChange->update([
            'classification' => DraftChangeClassification::from($classificationValue),
        ]);

        return new ModuleDraftChangeResource($draftChange);
    }
}
