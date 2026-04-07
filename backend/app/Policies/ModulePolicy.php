<?php

declare(strict_types=1);

namespace App\Policies;

final class ModulePolicy
{
    /**
     * Any authenticated user can list modules.
     */
    public function viewAny(): bool
    {
        return true;
    }

    /**
     * Any authenticated user can view a module.
     */
    public function view(): bool
    {
        return true;
    }

    /**
     * Regular users cannot create modules; super_admin bypass is handled by Gate::before().
     */
    public function create(): bool
    {
        return false;
    }

    /**
     * Regular users cannot update modules; super_admin bypass is handled by Gate::before().
     */
    public function update(): bool
    {
        return false;
    }

    /**
     * Regular users cannot delete modules; super_admin bypass is handled by Gate::before().
     */
    public function delete(): bool
    {
        return false;
    }
}
