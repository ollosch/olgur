<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\Module;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;
use Illuminate\Database\Query\Builder;

final class UnsubscribeFromModule
{
    /**
     * Unsubscribe a user from a module.
     *
     * If the module is a core module and the system requires a core subscription,
     * all expansion subscriptions for the same system are also removed (cascade unsubscription).
     */
    public function execute(User $user, Module $module): void
    {
        if ($module->is_core) {
            /** @var System|null $system */
            $system = System::query()->find($module->system_id);

            /** @var array<string, mixed> $systemConfig */
            $systemConfig = $system !== null ? ($system->config ?? []) : [];

            $requiresCoreSubscription = ($systemConfig['require_core_subscription'] ?? false) === true;

            if ($requiresCoreSubscription) {
                // Remove all expansion subscriptions for this system
                Subscription::query()
                    ->whereIn('module_id', function (Builder $query) use ($module): void {
                        $query->select('id')
                            ->from('modules')
                            ->where('system_id', $module->system_id)
                            ->where('is_core', false);
                    })
                    ->where('user_id', $user->id)
                    ->delete();
            }
        }

        Subscription::query()
            ->where('user_id', $user->id)
            ->where('module_id', $module->id)
            ->delete();
    }
}
