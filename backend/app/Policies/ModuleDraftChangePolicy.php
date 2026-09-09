<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Module;
use App\Models\System;
use App\Models\User;

final class ModuleDraftChangePolicy
{
    /**
     * Only system admins and the module's editors may review draft provenance.
     */
    public function viewAny(User $user, System $system, Module $module): bool
    {
        if ($module->isEditor($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }

    /**
     * Only system admins and the module's editors may reclassify draft changes.
     */
    public function update(User $user, System $system, Module $module): bool
    {
        if ($module->isEditor($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }
}
