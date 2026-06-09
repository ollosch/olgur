<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Module;
use App\Models\System;
use App\Models\User;

final class ModuleDraftChangePolicy
{
    /**
     * Module subscribers and system admins can view draft changes.
     */
    public function viewAny(User $user, System $system, Module $module): bool
    {
        if ($module->isSubscriber($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }
}
