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
     * List subscriptions.
     *
     * When called via GET /me/subscriptions, returns the authenticated user's own subscriptions.
     * When called via GET /systems/{system}/modules/{module}/subscriptions, returns all
     * subscriptions for that module (accessible to system admins and module editors).
     */
    public function index(Request $request, ?System $system = null, ?Module $module = null): AnonymousResourceCollection
    {
        if ($module instanceof Module) {
            Gate::authorize('viewAny', [Subscription::class, $module]);

            return SubscriptionResource::collection(
                $module->subscriptions()->with('module')->oldest()->get()
            );
        }

        Gate::authorize('viewAny', Subscription::class);

        /** @var User $subscriber */
        $subscriber = $request->user();

        return SubscriptionResource::collection(
            $subscriber->subscriptions()->with('module')->oldest()->get()
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
