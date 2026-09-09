<?php

declare(strict_types=1);

namespace App\Actions;

use App\Data\MembershipConfig;
use App\Models\Membership;
use App\Models\Module;

final class RemoveModuleFromMembershipConfigs
{
    /**
     * Remove a deleted module from every affected membership configuration.
     */
    public function execute(Module $module): void
    {
        Membership::query()
            ->where('system_id', $module->system_id)
            ->each(function (Membership $membership) use ($module): void {
                $config = $membership->config;

                $membership->update([
                    'config' => new MembershipConfig(
                        activeModuleIds: array_values(array_filter(
                            $config->activeModuleIds,
                            fn (string $activeModuleId): bool => $activeModuleId !== $module->id,
                        )),
                        bookmarks: $config->bookmarks,
                        ignoredTags: $config->ignoredTags,
                        acronymPopups: $config->acronymPopups,
                        preferredRuleFormat: $config->preferredRuleFormat,
                        selectedSopModuleId: $config->selectedSopModuleId === $module->id
                            ? null
                            : $config->selectedSopModuleId,
                    ),
                ]);
            });
    }

    /**
     * Clear selections for a module that no longer provides an SOP.
     */
    public function clearSopSelections(Module $module): void
    {
        Membership::query()
            ->where('system_id', $module->system_id)
            ->each(function (Membership $membership) use ($module): void {
                $config = $membership->config;

                if ($config->selectedSopModuleId !== $module->id) {
                    return;
                }

                $membership->update([
                    'config' => new MembershipConfig(
                        activeModuleIds: $config->activeModuleIds,
                        bookmarks: $config->bookmarks,
                        ignoredTags: $config->ignoredTags,
                        acronymPopups: $config->acronymPopups,
                        preferredRuleFormat: $config->preferredRuleFormat,
                        selectedSopModuleId: null,
                    ),
                ]);
            });
    }
}
