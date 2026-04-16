<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Module;
use App\Models\System;
use App\Models\User;

final class RulePolicy
{
    /**
     * Module members
     */
    public function viewAny(User $user, System $system, Module $module): bool
    {
        if ($module->isSubscriber($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }

    /**
     * Any authenticated user can view a rule.
     */
    public function view(User $user, System $system, Module $module): bool
    {
        if ($module->isSubscriber($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }

    /**
     * Module editors and system admins can create rules in a module.
     */
    public function create(User $user, System $system, Module $module): bool
    {
        if ($module->isEditor($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }

    /**
     * Module editors and system admins can update a rule.
     */
    public function update(User $user, System $system, Module $module): bool
    {
        if ($module->isEditor($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }

    /**
     * Module editors and system admins can delete a rule.
     */
    public function delete(User $user, System $system, Module $module): bool
    {
        if ($module->isEditor($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }
}
