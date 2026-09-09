<?php

declare(strict_types=1);

namespace App\Actions;

use App\Data\MembershipConfig;
use App\Models\Membership;
use App\Models\Module;
use App\Models\User;
use Illuminate\Validation\ValidationException;

final readonly class DeactivateModule
{
    public function __construct(private NormalizeMembershipConfig $normalizeMembershipConfig) {}

    /**
     * Deactivate an expansion module for a user within a system.
     *
     * Core modules cannot be toggled and will throw a ValidationException.
     * Preserves all other membership config fields (bookmarks, ignored_tags, etc.).
     * Clears the selected SOP module when it is the module being deactivated.
     *
     * @throws ValidationException when the module is core
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

        return $membership;
    }
}
