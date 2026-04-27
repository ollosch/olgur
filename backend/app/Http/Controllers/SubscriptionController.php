<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\SubscribeToModule;
use App\Actions\UnsubscribeFromModule;
use App\Http\Requests\StoreSubscriptionRequest;
use App\Http\Requests\UpdateSubscriptionRequest;
use App\Http\Resources\SubscriptionResource;
use App\Models\Module;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class SubscriptionController
{
    /**
     * List all subscriptions for a module.
     */
    public function index(System $system, Module $module): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [Subscription::class, $module]);

        return SubscriptionResource::collection(
            $module->subscriptions()->with('module')->oldest()->get()
        );
    }

    /**
     * Subscribe the authenticated user to a module.
     */
    public function store(
        StoreSubscriptionRequest $request,
        System $system,
        Module $module,
        SubscribeToModule $subscribeToModule,
    ): SubscriptionResource {
        $validated = $request->validated();

        /** @var User $subscriber */
        $subscriber = isset($validated['user_id'])
            ? User::query()->findOrFail($validated['user_id'])
            : $request->user();

        abort_if(
            $module->subscriptions()->where('user_id', $subscriber->id)->exists(),
            409,
            'The user is already subscribed to this module.',
        );

        Gate::authorize('create', [Subscription::class, $system, $subscriber]);

        $subscription = $subscribeToModule->execute($subscriber, $module);

        return new SubscriptionResource($subscription);
    }

    /**
     * Update a subscription (e.g. promote/demote editor).
     */
    public function update(
        UpdateSubscriptionRequest $request,
        System $system,
        Module $module,
        Subscription $subscription,
    ): SubscriptionResource {
        Gate::authorize('update', [$subscription, $system]);

        $subscription->update($request->validated());

        return new SubscriptionResource($subscription);
    }

    /**
     * Unsubscribe a user from a module.
     */
    public function destroy(
        Request $request,
        System $system,
        Module $module,
        Subscription $subscription,
        UnsubscribeFromModule $unsubscribeFromModule,
    ): Response {
        Gate::authorize('delete', [$subscription, $system]);

        /** @var User $owner */
        $owner = $subscription->user ?? $request->user();

        $unsubscribeFromModule->execute($owner, $module);

        return response()->noContent();
    }
}
