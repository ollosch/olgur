<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\CreateSystem;
use App\Http\Requests\StoreSystemRequest;
use App\Http\Requests\UpdateSystemRequest;
use App\Models\System;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

final class SystemController
{
    /**
     * Display a listing of the resource.
     */
    public function index(#[CurrentUser] User $user): JsonResponse
    {
        Gate::authorize('viewAny', System::class);

        return response()->json($user->systems);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreSystemRequest $request, CreateSystem $createSystem, #[CurrentUser] User $user): JsonResponse
    {
        Gate::authorize('create', System::class);

        $system = $createSystem->execute($user, $request->validated());

        return response()->json($system, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(System $system): JsonResponse
    {
        Gate::authorize('view', $system);

        $system->load(['modules' => function ($query) {
            $query->with(['versions' => function ($query) {
                $query->latest();
            }]);
        }]);

        return response()->json([
            'id' => $system->id,
            'name' => $system->name,
            'description' => $system->description,
            'modules' => $system->modules->map(function ($module) {
                return [
                    'id' => $module->id,
                    'type' => $module->type,
                    'name' => $module->name,
                    'description' => $module->description,
                    'versions' => $module->versions->map(function ($version) {
                        return [
                            'id' => $version->id,
                            'name' => $version->name,
                            'url' => $version->getUrl(),
                        ];
                    }),
                ];
            }),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateSystemRequest $request, System $system): JsonResponse
    {
        Gate::authorize('update', $system);

        $system->update($request->validated());

        return response()->json($system);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(System $system): JsonResponse
    {
        Gate::authorize('delete', $system);

        $system->delete();

        return response()->json(null, 204);
    }
}
