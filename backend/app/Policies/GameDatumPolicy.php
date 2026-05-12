<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Module;
use App\Models\System;
use App\Models\User;

final class GameDatumPolicy
{
    /**
     * Module subscribers and system admins can view game data.
     */
    public function viewAny(User $user, System $system, Module $module): bool
    {
        if ($module->isSubscriber($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }

    /**
     * Module subscribers and system admins can view a game datum.
     */
    public function view(User $user, System $system, Module $module): bool
    {
        if ($module->isSubscriber($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }

    /**
     * Module editors and system admins can create game data.
     */
    public function create(User $user, System $system, Module $module): bool
    {
        if ($module->isEditor($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }

    /**
     * Module editors and system admins can update game data.
     */
    public function update(User $user, System $system, Module $module): bool
    {
        if ($module->isEditor($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }

    /**
     * Module editors and system admins can delete game data.
     */
    public function delete(User $user, System $system, Module $module): bool
    {
        if ($module->isEditor($user)) {
            return true;
        }

        return $system->isAdmin($user);
    }
}
