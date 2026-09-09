<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Module;
use App\Models\ModuleVersion;
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
     * Subscribers and system admins can read a released version's content.
     */
    public function viewReleased(User $user, Module $module, ModuleVersion $version): bool
    {
        if ($version->released_at === null) {
            return false;
        }

        if ($module->system?->isAdmin($user)) {
            return true;
        }

        return $module->isSubscriber($user);
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

    /**
     * System admins and module editors can back-edit the latest released version.
     */
    public function amendLatest(User $user, Module $module): bool
    {
        if ($module->system?->isAdmin($user)) {
            return true;
        }

        return $module->isEditor($user);
    }
}
