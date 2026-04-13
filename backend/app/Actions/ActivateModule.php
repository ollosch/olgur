<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\Membership;
use App\Models\Module;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Validation\ValidationException;

final class ActivateModule
{
    /**
     * Activate an expansion module for a user within a system.
     *
     * Enforces:
     * - Module must not be a core module (core modules are always active).
     * - User must be subscribed to the module.
     * - If allow_concurrent_expansions is false (default), deactivates all other active
     *   expansion modules in the system before activating this one.
     *
     * @throws ValidationException when the module is core or the user is not subscribed
     */
    public function execute(User $user, Module $module): Membership
    {
        if ($module->is_core) {
            throw ValidationException::withMessages([
                'module_id' => ['Core modules are always active and cannot be toggled.'],
            ]);
        }

        $isSubscribed = Subscription::query()
            ->where('user_id', $user->id)
            ->where('module_id', $module->id)
            ->exists();

        if (! $isSubscribed) {
            throw ValidationException::withMessages([
                'module_id' => ['You must be subscribed to this module before activating it.'],
            ]);
        }

        $membership = Membership::query()
            ->where('user_id', $user->id)
            ->where('system_id', $module->system_id)
            ->firstOrFail();

        /** @var array<int, string> $activeIds */
        $activeIds = ($membership->config ?? [])['active_module_ids'] ?? [];

        $allowConcurrent = ($module->system->config['allow_concurrent_expansions'] ?? false) === true;

        if (! $allowConcurrent) {
            $activeIds = [];
        }

        if (! in_array($module->id, $activeIds, true)) {
            $activeIds[] = $module->id;
        }

        $membership->config = ['active_module_ids' => array_values($activeIds)];
        $membership->save();

        return $membership;
    }
}
