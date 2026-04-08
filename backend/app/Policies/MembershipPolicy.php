<?php

declare(strict_types=1);

namespace App\Policies;

final class MembershipPolicy
{
    /**
     * Any authenticated user can list memberships for a system.
     */
    public function viewAny(): bool
    {
        return true;
    }

    /**
     * Only super_admin can add members; super_admin bypass is handled by Gate::before().
     */
    public function create(): bool
    {
        return false;
    }

    /**
     * Only super_admin can promote/demote members; super_admin bypass is handled by Gate::before().
     */
    public function update(): bool
    {
        return false;
    }

    /**
     * Only super_admin can remove members; super_admin bypass is handled by Gate::before().
     */
    public function delete(): bool
    {
        return false;
    }
}
