<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreModuleRequest;
use App\Http\Requests\UpdateModuleRequest;
use App\Http\Resources\ModuleResource;
use App\Models\Membership;
use App\Models\Module;
use App\Models\System;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class ModuleController
{
    /**
     * Display a listing of modules for the given system.
     */
    public function index(System $system): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [Module::class, $system]);

        return ModuleResource::collection($system->modules);
    }

    /**
     * Store a newly created module within the given system.
     */
    public function store(StoreModuleRequest $request, System $system): ModuleResource
    {
        Gate::authorize('create', [Module::class, $system]);

        $module = $system->modules()->create($request->validated());

        /** @var User $creator */
        $creator = $request->user();

        // Ensure the creator is a system member (they should already be, but guard just in case)
        Membership::query()->firstOrCreate(
            ['user_id' => $creator->id, 'system_id' => $system->id],
            ['admin' => false],
        );

        // Auto-subscribe the creator as an editor of the new module.
        // We bypass SubscribeToModule because the person creating a module is
        // always entitled to edit it.
        $module->subscriptions()->updateOrCreate(
            ['user_id' => $creator->id],
            ['editor' => true],
        );

        return new ModuleResource($module);
    }

    /**
     * Display the specified module.
     */
    public function show(System $system, Module $module): ModuleResource
    {
        Gate::authorize('view', $module);

        return new ModuleResource($module);
    }

    /**
     * Update the specified module.
     */
    public function update(UpdateModuleRequest $request, System $system, Module $module): ModuleResource
    {
        Gate::authorize('update', $module);

        $module->update($request->validated());

        return new ModuleResource($module);
    }

    /**
     * Remove the specified module.
     */
    public function destroy(System $system, Module $module): Response
    {
        Gate::authorize('delete', $module);

        abort_if($module->is_core, 422, 'Core modules cannot be deleted.');

        $module->delete();

        return response()->noContent();
    }
}
