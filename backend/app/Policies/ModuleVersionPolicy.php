<?php

declare(strict_types=1);

namespace App\Policies;

final class ModuleVersionPolicy
{
    /**
     * Any authenticated user can list module versions.
     */
    public function viewAny(): bool
    {
        return true;
    }

    /**
     * Any authenticated user can create a module version.
     */
    public function create(): bool
    {
        return true;
    }

    /**
     * Any authenticated user can view a module version.
     */
    public function show(): bool
    {
        return true;
    }
}
