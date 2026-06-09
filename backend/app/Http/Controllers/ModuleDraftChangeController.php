<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\ModuleDraftChangeResource;
use App\Models\Module;
use App\Models\ModuleDraftChange;
use App\Models\System;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

final class ModuleDraftChangeController
{
    /**
     * Display a listing of draft changes for the given module.
     */
    public function index(System $system, Module $module): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [ModuleDraftChange::class, $system, $module]);

        return ModuleDraftChangeResource::collection(
            $module->draftChanges()->oldest('changed_at')->get()
        );
    }
}
