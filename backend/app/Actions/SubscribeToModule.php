<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\Module;
use App\Models\Subscription;
use App\Models\User;

final class SubscribeToModule
{
    /**
     * Subscribe a user to a module.
     *
     * Subscribing to an expansion also auto-subscribes the user to the system's
     * core module when one exists, since every member is always entitled to core.
     */
    public function execute(User $user, Module $module): Subscription
    {
        if (! $module->is_core) {
            $coreModule = Module::query()
                ->where('system_id', $module->system_id)
                ->where('is_core', true)
                ->first();

            if ($coreModule !== null) {
                Subscription::query()->firstOrCreate([
                    'user_id' => $user->id,
                    'module_id' => $coreModule->id,
                ]);
            }
        }

        /** @var Subscription $subscription */
        $subscription = Subscription::query()->firstOrCreate([
            'user_id' => $user->id,
            'module_id' => $module->id,
        ]);

        return $subscription;
    }
}
