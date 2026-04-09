<?php

declare(strict_types=1);

namespace App\Policies;

final class IndexEntryPolicy
{
    /**
     * Any authenticated user can list index entries.
     */
    public function viewAny(): bool
    {
        return true;
    }

    /**
     * Any authenticated user can view an index entry.
     */
    public function view(): bool
    {
        return true;
    }

    /**
     * Regular users cannot create index entries; super_admin bypass is handled by Gate::before().
     */
    public function create(): bool
    {
        return false;
    }

    /**
     * Regular users cannot update index entries; super_admin bypass is handled by Gate::before().
     */
    public function update(): bool
    {
        return false;
    }

    /**
     * Regular users cannot delete index entries; super_admin bypass is handled by Gate::before().
     */
    public function delete(): bool
    {
        return false;
    }
}
