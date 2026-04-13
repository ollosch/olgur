<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\System;
use App\Models\User;

final class SystemPolicy
{
    /**
     * Any authenticated user can list systems.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Any authenticated user can view a system.
     */
    public function view(User $user, System $system): bool
    {
        return true;
    }

    /**
     * Any authenticated user can create systems
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * System admins (admin membership) can update their own system.
     */
    public function update(User $user, System $system): bool
    {
        return $system->isAdmin($user);
    }

    /**
     * System admins (admin membership) can delete their own system.
     */
    public function delete(User $user, System $system): bool
    {
        return $system->isAdmin($user);
    }
}
