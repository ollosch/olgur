<?php

declare(strict_types=1);

namespace App\Actions;

use App\Data\MembershipConfig;
use App\Models\Membership;
use App\Models\Module;
use App\Models\User;
use Illuminate\Validation\ValidationException;

final readonly class ActivateModule
{
    public function __construct(private NormalizeMembershipConfig $normalizeMembershipConfig) {}

    /**
     * Activate an expansion module for a user within a system.
     *
     * Enforces:
     * - Module must not be a core module (core modules are always active).
     * - User must be subscribed to the module.
     * - Preserves all other membership config fields (bookmarks, ignored_tags, etc.).
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

        $membership = Membership::query()
            ->where('user_id', $user->id)
            ->where('system_id', $module->system_id)
            ->firstOrFail();

        $config = $membership->config;

        /** @var array<int, string> $activeIds */
        $activeIds = $config->activeModuleIds;

        if (! in_array($module->id, $activeIds, strict: true)) {
            $activeIds[] = $module->id;
        }

        $membership->config = $this->normalizeMembershipConfig->execute($membership, $user, new MembershipConfig(
            activeModuleIds: $activeIds,
            bookmarks: $config->bookmarks,
            ignoredTags: $config->ignoredTags,
            acronymPopups: $config->acronymPopups,
            preferredRuleFormat: $config->preferredRuleFormat,
            selectedSopModuleId: $config->selectedSopModuleId,
        ));
        $membership->save();

        return $membership;
    }
}
