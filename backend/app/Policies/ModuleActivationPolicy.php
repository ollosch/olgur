<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Membership;
use App\Models\Module;
use App\Models\Subscription;
use App\Models\User;

final class ModuleActivationPolicy
{
    /**
     * A user can activate an expansion module if they are:
     * - A member of the module's system
     * - Subscribed to the module
     */
    public function create(User $user, Module $module): bool
    {
        return Membership::query()
            ->where('user_id', $user->id)
            ->where('system_id', $module->system_id)
            ->exists() && Subscription::query()
            ->where('user_id', $user->id)
            ->where('module_id', $module->id)
            ->exists();
    }

    /**
     * A user can deactivate an expansion module if they are a member of the module's system.
     * No subscription check is needed for deactivation.
     */
    public function delete(User $user, Module $module): bool
    {
        return Membership::query()
            ->where('user_id', $user->id)
            ->where('system_id', $module->system_id)
            ->exists();
    }
}
