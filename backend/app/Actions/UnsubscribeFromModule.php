<?php

declare(strict_types=1);

namespace App\Actions;

use App\Data\MembershipConfig;
use App\Models\Membership;
use App\Models\Module;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Validation\ValidationException;

final readonly class UnsubscribeFromModule
{
    public function __construct(private NormalizeMembershipConfig $normalizeMembershipConfig) {}

    /**
     * Unsubscribe a user from a module.
     *
     * Core subscriptions are never individually revocable; they are only removed
     * atomically with the membership. For expansion modules, the module is removed
     * from active_module_ids in the membership while preserving all other config
     * fields (bookmarks, ignored_tags, etc.).
     *
     * @throws ValidationException when the module is core
     */
    public function execute(User $user, Module $module): void
    {
        if ($module->is_core) {
            throw ValidationException::withMessages([
                'module_id' => ['Core subscriptions cannot be revoked individually; they are removed with the membership.'],
            ]);
        }

        $membership = Membership::query()
            ->where('user_id', $user->id)
            ->where('system_id', $module->system_id)
            ->first();

        if ($membership !== null) {
            $config = $membership->config;

            $activeIds = array_values(
                array_filter($config->activeModuleIds, fn (string $id): bool => $id !== $module->id)
            );

            $membership->config = $this->normalizeMembershipConfig->execute($membership, $user, new MembershipConfig(
                activeModuleIds: $activeIds,
                bookmarks: $config->bookmarks,
                ignoredTags: $config->ignoredTags,
                acronymPopups: $config->acronymPopups,
                preferredRuleFormat: $config->preferredRuleFormat,
                selectedSopModuleId: $config->selectedSopModuleId === $module->id
                    ? null
                    : $config->selectedSopModuleId,
            ));
            $membership->save();
        }

        Subscription::query()
            ->where('user_id', $user->id)
            ->where('module_id', $module->id)
            ->delete();
    }
}
