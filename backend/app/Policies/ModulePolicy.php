<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Membership;
use App\Models\Module;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;

final class ModulePolicy
{
    /**
     * Any authenticated user can list modules.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Any authenticated user can view a module.
     */
    public function view(User $user, Module $module): bool
    {
        return true;
    }

    /**
     * System admins can create modules within their system.
     */
    public function create(User $user, System $system): bool
    {
        return $system->isAdmin($user);
    }

    /**
     * System admins and module editors can update a module.
     */
    public function update(User $user, Module $module): bool
    {
        if ($module->system?->isAdmin($user)) {
            return true;
        }

        return $module->isEditor($user);
    }

    /**
     * Only system admins can delete a module.
     */
    public function delete(User $user, Module $module): bool
    {
        return (bool) $module->system?->isAdmin($user);
    }

    /**
     * A user can activate an expansion module if they are:
     * - A member of the module's system
     * - Subscribed to the module
     */
    public function activate(User $user, Module $module): bool
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
    public function deactivate(User $user, Module $module): bool
    {
        return Membership::query()
            ->where('user_id', $user->id)
            ->where('system_id', $module->system_id)
            ->exists();
    }
}
