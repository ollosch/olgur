<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreSystemRequest;
use App\Http\Requests\UpdateSystemRequest;
use App\Http\Resources\SystemResource;
use App\Models\System;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class SystemController
{
    /**
     * Display a listing of all systems.
     */
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', System::class);

        return SystemResource::collection(
            System::query()->orderBy('name')->get()
        );
    }

    /**
     * Store a newly created system.
     */
    public function store(StoreSystemRequest $request): SystemResource
    {
        Gate::authorize('create', System::class);

        $system = System::query()->create($request->validated());

        return new SystemResource($system);
    }

    /**
     * Display the specified system.
     */
    public function show(System $system): SystemResource
    {
        Gate::authorize('view', $system);

        return new SystemResource($system);
    }

    /**
     * Update the specified system.
     */
    public function update(UpdateSystemRequest $request, System $system): SystemResource
    {
        Gate::authorize('update', $system);

        $system->update($request->validated());

        return new SystemResource($system);
    }

    /**
     * Remove the specified system.
     */
    public function destroy(System $system): Response
    {
        Gate::authorize('delete', $system);

        $system->delete();

        return response()->noContent();
    }
}
