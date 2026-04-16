<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Module;
use App\Models\System;
use App\Models\User;

final class IndexEntryPolicy
{
    /**
     * Any authenticated user can list index entries.
     */
    public function viewAny(User $user, System $system, Module $module): bool
    {
        if ($module->isSubscriber($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }

    /**
     * Any authenticated user can view an index entry.
     */
    public function view(User $user, System $system, Module $module): bool
    {
        if ($module->isSubscriber($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }

    /**
     * Module editors and system admins can create index entries in a module.
     */
    public function create(User $user, System $system, Module $module): bool
    {
        if ($module->isEditor($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }

    /**
     * Module editors and system admins can update an index entry.
     */
    public function update(User $user, System $system, Module $module): bool
    {
        if ($module->isEditor($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }

    /**
     * Module editors and system admins can delete an index entry.
     */
    public function delete(User $user, System $system, Module $module): bool
    {
        if ($module->isEditor($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }
}
