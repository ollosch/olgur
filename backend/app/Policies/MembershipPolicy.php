<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Membership;
use App\Models\System;
use App\Models\User;

final class MembershipPolicy
{
    /**
     * System admins can list memberships for their system.
     */
    public function viewAny(User $user, System $system): bool
    {
        return $system->isAdmin($user);
    }

    /**
     * System admins can add members to their system.
     * Users can add themselves to a system.
     */
    public function create(User $user, System $system, ?User $member = null): bool
    {
        if ($member && $member->id !== $user->id) {
            return $system->isAdmin($user);
        }

        return true;
    }

    /**
     * System admins can promote/demote members in their system.
     */
    public function update(User $user, Membership $membership): bool
    {
        return (bool) $membership->system?->isAdmin($user);
    }

    /**
     * System admins can remove any member from their system.
     * Members can remove themselves from a system.
     */
    public function delete(User $user, Membership $membership): bool
    {
        if ($membership->system?->isAdmin($user)) {
            return true;
        }

        return $membership->isMember($user);
    }
}
