<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\SubscribeToModule;
use App\Actions\UnsubscribeFromModule;
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
     * List the authenticated user's subscriptions.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Subscription::class);

        /** @var User $user */
        $user = $request->user();

        return SubscriptionResource::collection(
            $user->subscriptions()->with('module')->oldest()->get()
        );
    }

    /**
     * Subscribe the authenticated user to a module.
     */
    public function store(
        Request $request,
        System $system,
        Module $module,
        SubscribeToModule $action,
    ): SubscriptionResource {
        Gate::authorize('create', Subscription::class);

        /** @var User $user */
        $user = $request->user();

        $subscription = $action->execute($user, $module);

        return new SubscriptionResource($subscription);
    }

    /**
     * Unsubscribe the authenticated user from a module.
     */
    public function destroy(
        Request $request,
        System $system,
        Module $module,
        UnsubscribeFromModule $action,
    ): Response {
        /** @var User $user */
        $user = $request->user();

        $subscription = Subscription::query()
            ->where('user_id', $user->id)
            ->where('module_id', $module->id)
            ->firstOrFail();

        Gate::authorize('delete', $subscription);

        $action->execute($user, $module);

        return response()->noContent();
    }
}
