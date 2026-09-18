<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Module;
use App\Models\System;
use App\Models\User;

final class ModulePolicy
{
    /**
     * System members can list modules.
     */
    public function viewAny(User $user, System $system): bool
    {
        return $system->isMember($user);
    }

    /**
     * System members can view a module.
     */
    public function view(User $user, Module $module): bool
    {
        return (bool) $module->system?->isMember($user);
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
}
