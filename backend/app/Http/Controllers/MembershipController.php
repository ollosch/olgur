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
        Gate::authorize('viewAny', [Membership::class, $system]);

        return MembershipResource::collection(
            $system->memberships()->oldest()->get()
        );
    }

    /**
     * Add a user to a system.
     */
    public function store(StoreMembershipRequest $request, System $system): MembershipResource
    {
        $validated = $request->validated();

        /** @var User $member */
        $member = isset($validated['user_id'])
            ? User::query()->findOrFail($validated['user_id'])
            : $request->user();

        // If the user is adding themselves, they cannot self-assign admin
        if ($member->id === $request->user()?->id) {
            unset($validated['admin']);
        }

        Gate::authorize('create', [Membership::class, $system, $member]);

        abort_if($system->isMember($member), 409, 'Already a member.');

        $membership = $system->memberships()->create([
            'user_id' => $member->id,
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
