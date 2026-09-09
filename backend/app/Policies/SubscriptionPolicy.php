<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Module;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;

final class SubscriptionPolicy
{
    /**
     * System admins and module editors can view all subscriptions for a module.
     */
    public function viewAny(User $user, Module $module): bool
    {
        /** @var System|null $system */
        $system = $module->system;

        if ($system instanceof System && $system->isAdmin($user)) {
            return true;
        }

        return $module->isEditor($user);
    }

    /**
     * System admins can subscribe users to modules in their system.
     */
    public function create(User $user, System $system): bool
    {
        return $system->isAdmin($user);
    }

    /**
     * System admins can promote/demote members in their system.
     */
    public function update(User $user, Subscription $subscription, System $system): bool
    {
        return $system->isAdmin($user);
    }

    /**
     * System admins can unsubscribe users from modules in their system.
     * Users cannot unsubscribe themselves; subscriptions are durable entitlements.
     */
    public function delete(User $user, Subscription $subscription, System $system): bool
    {
        return $system->isAdmin($user);
    }
}
