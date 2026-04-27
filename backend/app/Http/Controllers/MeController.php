<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\MembershipResource;
use App\Http\Resources\SubscriptionResource;
use App\Http\Resources\UserResource;
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
}
