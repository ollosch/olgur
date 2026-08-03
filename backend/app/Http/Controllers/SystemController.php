<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\SystemStructure;
use App\Http\Requests\StoreSystemRequest;
use App\Http\Requests\UpdateSystemRequest;
use App\Http\Resources\SystemResource;
use App\Models\System;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class SystemController
{
    /**
     * Display systems the authenticated user belongs to.
     */
    public function index(#[CurrentUser] User $user): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', System::class);

        return SystemResource::collection(System::query()
            ->whereHas('memberships', fn (Builder $query): Builder => $query->where('user_id', $user->id))
            ->orderBy('name')
            ->get());
    }

    /**
     * Store a newly created system.
     */
    public function store(StoreSystemRequest $request): SystemResource
    {
        Gate::authorize('create', System::class);

        $system = System::query()->create($request->validated());

        /** @var User $creator */
        $creator = $request->user();
        $system->memberships()->create([
            'user_id' => $creator->id,
            'admin' => true,
        ]);

        // Core-based structures require a core module to function; auto-create one
        // so the system is immediately usable without an extra manual step.
        $structure = $system->config?->structure;
        if ($structure === SystemStructure::CorePlusOne || $structure === SystemStructure::CorePlusMany) {
            $coreModule = $system->modules()->create([
                'name' => 'Core',
                'slug' => 'core',
                'description' => '',
                'config' => [],
                'is_core' => true,
                'sort_order' => 0,
            ]);

            $coreModule->subscriptions()->updateOrCreate(
                ['user_id' => $creator->id],
                ['editor' => true],
            );
        }

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
