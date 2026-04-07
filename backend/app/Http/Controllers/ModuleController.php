<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreModuleRequest;
use App\Http\Requests\UpdateModuleRequest;
use App\Http\Resources\ModuleResource;
use App\Models\Module;
use App\Models\System;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class ModuleController
{
    /**
     * Display a listing of modules for the given system.
     */
    public function index(System $system): AnonymousResourceCollection
    {
        return ModuleResource::collection($system->modules);
    }

    /**
     * Store a newly created module within the given system.
     */
    public function store(StoreModuleRequest $request, System $system): ModuleResource
    {
        $module = $system->modules()->create($request->validated());

        return new ModuleResource($module);
    }

    /**
     * Display the specified module.
     */
    public function show(System $system, Module $module): ModuleResource
    {
        return new ModuleResource($module);
    }

    /**
     * Update the specified module.
     */
    public function update(UpdateModuleRequest $request, System $system, Module $module): ModuleResource
    {
        $module->update($request->validated());

        return new ModuleResource($module);
    }

    /**
     * Remove the specified module.
     */
    public function destroy(System $system, Module $module): Response
    {
        $module->delete();

        return response()->noContent();
    }
}
