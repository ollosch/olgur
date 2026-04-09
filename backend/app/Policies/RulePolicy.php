<?php

declare(strict_types=1);

namespace App\Policies;

final class RulePolicy
{
    /**
     * Any authenticated user can list rules.
     */
    public function viewAny(): bool
    {
        return true;
    }

    /**
     * Any authenticated user can view a rule.
     */
    public function view(): bool
    {
        return true;
    }

    /**
     * Regular users cannot create rules; super_admin bypass is handled by Gate::before().
     */
    public function create(): bool
    {
        return false;
    }

    /**
     * Regular users cannot update rules; super_admin bypass is handled by Gate::before().
     */
    public function update(): bool
    {
        return false;
    }

    /**
     * Regular users cannot delete rules; super_admin bypass is handled by Gate::before().
     */
    public function delete(): bool
    {
        return false;
    }
}
