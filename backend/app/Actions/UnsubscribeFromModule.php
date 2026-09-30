<?php

declare(strict_types=1);

namespace App\Actions;

use App\Data\MembershipConfig;
use App\Models\Membership;
use App\Models\Module;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Validation\ValidationException;

final class UnsubscribeFromModule
{
    /**
     * Unsubscribe a user from a module.
     *
     * Core subscriptions are never individually revocable; they are only removed
     * atomically with the membership.
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

        Subscription::query()
            ->where('user_id', $user->id)
            ->where('module_id', $module->id)
            ->delete();

        $membership = Membership::query()
            ->where('user_id', $user->id)
            ->where('system_id', $module->system_id)
            ->first();

        if ($membership !== null && $membership->config->selectedModuleId === $module->id) {
            $membership->update([
                'config' => MembershipConfig::fromArray(array_merge(
                    $membership->config->toArray(),
                    ['selected_module_id' => null],
                )),
            ]);
        }
    }
}
