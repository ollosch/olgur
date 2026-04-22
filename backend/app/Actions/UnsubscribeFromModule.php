<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\Membership;
use App\Models\Module;
use App\Models\Subscription;
use App\Models\User;

final class UnsubscribeFromModule
{
    /**
     * Unsubscribe a user from a module.
     *
     * For expansion modules, the module is removed from active_module_ids in the membership.
     * No cascade logic — unsubscribing from core does not affect expansion subscriptions.
     */
    public function execute(User $user, Module $module): void
    {
        if (! $module->is_core) {
            // Individual expansion unsubscription — remove module from active_module_ids
            $membership = Membership::query()
                ->where('user_id', $user->id)
                ->where('system_id', $module->system_id)
                ->first();

            if ($membership !== null) {
                /** @var array<int, string> $activeIds */
                $activeIds = ($membership->config ?? [])['active_module_ids'] ?? [];
                $activeIds = array_values(array_filter($activeIds, fn (string $id): bool => $id !== $module->id));
                $membership->config = ['active_module_ids' => $activeIds];
                $membership->save();
            }
        }

        Subscription::query()
            ->where('user_id', $user->id)
            ->where('module_id', $module->id)
            ->delete();
    }
}
