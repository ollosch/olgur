<?php

declare(strict_types=1);

namespace App\Actions;

use App\Enums\SystemStructure;
use App\Models\Membership;
use App\Models\Module;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Validation\ValidationException;

final class SubscribeToModule
{
    /**
     * Subscribe a user to a module, enforcing structure-based rules.
     *
     * - CorePlusMany: user must have a core subscription before subscribing to an expansion (if a core module exists).
     * - CorePlusOne: auto-subscribes user to the core module if one exists.
     * - GroupingOnly: no extra mechanics.
     *
     * @throws ValidationException when the core prerequisite is not satisfied
     */
    public function execute(User $user, Module $module): Subscription
    {
        // Auto-create membership if the user is not yet a member of this system
        Membership::query()->firstOrCreate([
            'user_id' => $user->id,
            'system_id' => $module->system_id,
        ], [
            'admin' => false,
        ]);

        if (! $module->is_core) {
            $structure = $module->system?->config?->structure ?? SystemStructure::GroupingOnly;  // @phpstan-ignore nullsafe.neverNull

            if ($structure === SystemStructure::CorePlusMany) {
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
            } elseif ($structure === SystemStructure::CorePlusOne) {
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
