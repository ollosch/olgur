<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreMembershipRequest;
use App\Http\Requests\UpdateMembershipRequest;
use App\Http\Resources\MembershipResource;
use App\Models\Membership;
use App\Models\System;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class MembershipController
{
    /**
     * Display all memberships for a system.
     */
    public function index(System $system): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Membership::class);

        return MembershipResource::collection(
            $system->memberships()->oldest()->get()
        );
    }

    /**
     * Add a user to a system.
     */
    public function store(StoreMembershipRequest $request, System $system): MembershipResource
    {
        Gate::authorize('create', Membership::class);

        $validated = $request->validated();

        /** @var User $user */
        $user = User::query()->findOrFail($validated['user_id']);

        $membership = $system->memberships()->create([
            'user_id' => $user->id,
            'admin' => $validated['admin'] ?? false,
        ]);

        return new MembershipResource($membership);
    }

    /**
     * Update a membership (promote/demote admin).
     */
    public function update(UpdateMembershipRequest $request, System $system, Membership $membership): MembershipResource
    {
        Gate::authorize('update', $membership);

        $membership->update($request->validated());

        return new MembershipResource($membership);
    }

    /**
     * Remove a user from a system.
     */
    public function destroy(System $system, Membership $membership): Response
    {
        Gate::authorize('delete', $membership);

        $membership->delete();

        return response()->noContent();
    }
}
