<?php

declare(strict_types=1);

namespace App\Actions;

use App\Data\MembershipConfig;
use App\Enums\GameDataType;
use App\Models\GameDatum;
use App\Models\Membership;
use App\Models\Module;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;
use Illuminate\Validation\ValidationException;

final class NormalizeMembershipConfig
{
    /**
     * Validate and normalize a membership config before it is persisted.
     *
     * Active module IDs must be distinct, non-core modules in the membership's
     * system to which the user is subscribed, and satisfy the system's structure
     * constraints. The selected SOP module is normalized rather than rejected: it
     * is cleared whenever it no longer names an active SOP-providing module.
     *
     * @throws ValidationException when the active module IDs are invalid
     */
    public function execute(Membership $membership, User $user, MembershipConfig $config): MembershipConfig
    {
        $system = $membership->system()->firstOrFail();

        $activeModuleIds = array_values($config->activeModuleIds);

        $this->validateActiveModules($membership, $user, $activeModuleIds);

        return new MembershipConfig(
            activeModuleIds: $activeModuleIds,
            bookmarks: $config->bookmarks,
            ignoredTags: $config->ignoredTags,
            acronymPopups: $config->acronymPopups,
            preferredRuleFormat: $config->preferredRuleFormat,
            selectedSopModuleId: $this->normalizeSopSelection($system, $activeModuleIds, $config->selectedSopModuleId),
        );
    }

    /**
     * @param  array<int, string>  $activeModuleIds
     */
    private function validateActiveModules(Membership $membership, User $user, array $activeModuleIds): void
    {
        if (count($activeModuleIds) !== count(array_unique($activeModuleIds))) {
            throw ValidationException::withMessages([
                'config.active_module_ids' => ['Active modules must be distinct.'],
            ]);
        }

        $modules = Module::query()
            ->where('system_id', $membership->system_id)
            ->whereIn('id', $activeModuleIds)
            ->get()
            ->keyBy(fn (Module $module): string => $module->id);

        foreach ($activeModuleIds as $activeModuleId) {
            $module = $modules->get($activeModuleId);

            if ($module === null) {
                throw ValidationException::withMessages([
                    'config.active_module_ids' => ['Each active module must belong to this system.'],
                ]);
            }

            if ($module->is_core) {
                throw ValidationException::withMessages([
                    'config.active_module_ids' => ['Core modules are always active and cannot be listed as active expansions.'],
                ]);
            }
        }

        $subscribedCount = Subscription::query()
            ->where('user_id', $user->id)
            ->whereIn('module_id', $activeModuleIds)
            ->count();

        if ($subscribedCount !== count($activeModuleIds)) {
            throw ValidationException::withMessages([
                'config.active_module_ids' => ['You must be subscribed to each active module.'],
            ]);
        }
    }

    /**
     * @param  array<int, string>  $activeModuleIds
     */
    private function normalizeSopSelection(System $system, array $activeModuleIds, ?string $selectedSopModuleId): ?string
    {
        if ($selectedSopModuleId === null) {
            return null;
        }

        $isActive = in_array($selectedSopModuleId, $activeModuleIds, strict: true)
            || Module::query()
                ->where('system_id', $system->id)
                ->where('id', $selectedSopModuleId)
                ->where('is_core', true)
                ->exists();

        if (! $isActive) {
            return null;
        }

        $providesSop = GameDatum::query()
            ->where('module_id', $selectedSopModuleId)
            ->where('type', GameDataType::Sop->value)
            ->exists();

        return $providesSop ? $selectedSopModuleId : null;
    }
}
