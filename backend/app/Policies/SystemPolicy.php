<?php

declare(strict_types=1);

namespace App\Policies;

final class SystemPolicy
{
    /**
     * Any authenticated user can list systems.
     */
    public function viewAny(): bool
    {
        return true;
    }

    /**
     * Any authenticated user can view a system.
     */
    public function view(): bool
    {
        return true;
    }

    /**
     * Regular users cannot create systems; super_admin bypass is handled by Gate::before().
     */
    public function create(): bool
    {
        return false;
    }

    /**
     * Regular users cannot update systems; super_admin bypass is handled by Gate::before().
     */
    public function update(): bool
    {
        return false;
    }

    /**
     * Regular users cannot delete systems; super_admin bypass is handled by Gate::before().
     */
    public function delete(): bool
    {
        return false;
    }
}
