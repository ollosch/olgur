<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Module;
use App\Models\User;

final class ModuleVersionPolicy
{
    /**
     * Any authenticated user can list module versions.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * System admins and module editors can publish a new version.
     */
    public function create(User $user, Module $module): bool
    {
        if ($module->system?->isAdmin($user)) {
            return true;
        }

        return $module->isEditor($user);
    }
}
