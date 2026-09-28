<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Module;
use App\Models\Proofread;
use App\Models\System;
use App\Models\User;

final class ProofreadPolicy
{
    /**
     * System admins and proofreaders can list a system's proofreads.
     */
    public function viewAny(User $user, System $system): bool
    {
        return $this->canProofread($user, $system);
    }

    /**
     * System admins and proofreaders can view proofread records.
     */
    public function view(User $user, System $system): bool
    {
        return $this->canProofread($user, $system);
    }

    /**
     * System admins and proofreaders can add a proofread, provided they can
     * view the target entity's module.
     */
    public function create(User $user, System $system, Module $module): bool
    {
        if (! $this->canProofread($user, $system)) {
            return false;
        }

        return $this->canViewEntity($user, $system, $module);
    }

    /**
     * Users may only remove their own proofread rows.
     */
    public function delete(User $user, Proofread $proofread, System $system, Module $module): bool
    {
        if ($proofread->user_id !== $user->id) {
            return false;
        }

        if (! $this->canProofread($user, $system)) {
            return false;
        }

        return $this->canViewEntity($user, $system, $module);
    }

    private function canProofread(User $user, System $system): bool
    {
        if ($system->isAdmin($user)) {
            return true;
        }

        return $system->isProofreader($user);
    }

    private function canViewEntity(User $user, System $system, Module $module): bool
    {
        if ($module->isSubscriber($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }
}
