<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\NormalizeMembershipConfig;
use App\Data\MembershipConfig;
use App\Http\Requests\UpdateMembershipConfigRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\MembershipResource;
use App\Http\Resources\SubscriptionResource;
use App\Http\Resources\UserResource;
use App\Models\Membership;
use App\Models\System;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class MeController
{
    /**
     * Return the authenticated user.
     */
    public function show(Request $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();

        return new UserResource($user);
    }

    /**
     * Update the authenticated user's profile.
     */
    public function update(UpdateProfileRequest $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();
        $user->update($request->validated());

        return new UserResource($user->fresh() ?? $user);
    }

    /**
     * Return the authenticated user's memberships.
     */
    public function memberships(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        return MembershipResource::collection($user->memberships()->oldest()->get());
    }

    /**
     * Return the authenticated user's subscriptions.
     */
    public function subscriptions(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        return SubscriptionResource::collection($user->subscriptions()->with('module')->oldest()->get());
    }

    /**
     * Update the authenticated user's membership config for a system.
     */
    public function updateMembership(
        UpdateMembershipConfigRequest $request,
        System $system,
        NormalizeMembershipConfig $normalizeMembershipConfig,
    ): MembershipResource {
        /** @var User $user */
        $user = $request->user();

        /** @var Membership $membership */
        $membership = $system->memberships()
            ->where('user_id', $user->id)
            ->firstOrFail();

        /** @var array<string, mixed> $incoming */
        $incoming = $request->validated('config');

        $merged = MembershipConfig::fromArray(array_merge($membership->config->toArray(), $incoming));

        $membership->update([
            'config' => $normalizeMembershipConfig->execute($membership, $user, $merged)->toArray(),
        ]);

        return new MembershipResource($membership);
    }
}
