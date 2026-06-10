<?php

declare(strict_types=1);

namespace App\Actions;

use App\Data\MembershipConfig;
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
     * Preserves all other membership config fields (bookmarks, ignored_tags, etc.).
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
                $config = $membership->config;

                $activeIds = array_values(
                    array_filter($config->activeModuleIds, fn (string $id): bool => $id !== $module->id)
                );

                $membership->config = new MembershipConfig(
                    activeModuleIds: $activeIds,
                    bookmarks: $config->bookmarks,
                    ignoredTags: $config->ignoredTags,
                    acronymPopups: $config->acronymPopups,
                    preferredRuleFormat: $config->preferredRuleFormat,
                );
                $membership->save();
            }
        }

        Subscription::query()
            ->where('user_id', $user->id)
            ->where('module_id', $module->id)
            ->delete();
    }
}
