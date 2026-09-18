<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\Module;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Validation\ValidationException;

final class SubscribeToModule
{
    /**
     * Subscribe a user to a module, enforcing structure-based rules.
     *
     * - Global rule numbers: user must have a core subscription before subscribing to an expansion (if a core module exists).
     * - Module-local rule numbers: auto-subscribes user to the core module if one exists.
     *
     * @throws ValidationException when the core prerequisite is not satisfied
     */
    public function execute(User $user, Module $module): Subscription
    {
        if (! $module->is_core) {
            $hasGlobalRuleNumbers = $module->system?->config?->hasGlobalRuleNumbers() ?? false;

            if ($hasGlobalRuleNumbers) {
                $coreModule = Module::query()
                    ->where('system_id', $module->system_id)
                    ->where('is_core', true)
                    ->first();

                if ($coreModule !== null) {
                    $hasCoreSubscription = Subscription::query()
                        ->where('module_id', $coreModule->id)
                        ->where('user_id', $user->id)
                        ->exists();

                    if (! $hasCoreSubscription) {
                        throw ValidationException::withMessages([
                            'module_id' => ['You must subscribe to a core module before subscribing to an expansion.'],
                        ]);
                    }
                }
            } else {
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
        }

        /** @var Subscription $subscription */
        $subscription = Subscription::query()->firstOrCreate([
            'user_id' => $user->id,
            'module_id' => $module->id,
        ]);

        return $subscription;
    }
}
