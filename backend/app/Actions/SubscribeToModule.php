<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\Module;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Query\Builder;
use Illuminate\Validation\ValidationException;

final class SubscribeToModule
{
    /**
     * Subscribe a user to a module, enforcing the core prerequisite rule.
     *
     * If the module is not a core module, the user must already be subscribed
     * to at least one core module within the same system.
     *
     * @throws ValidationException when the core prerequisite is not satisfied
     */
    public function execute(User $user, Module $module): Subscription
    {
        if (! $module->is_core) {
            $hasCoreSubscription = Subscription::query()
                ->whereIn('module_id', function (Builder $query) use ($module): void {
                    $query->select('id')
                        ->from('modules')
                        ->where('system_id', $module->system_id)
                        ->where('is_core', true);
                })
                ->where('user_id', $user->id)
                ->exists();

            if (! $hasCoreSubscription) {
                throw ValidationException::withMessages([
                    'module_id' => ['You must subscribe to a core module before subscribing to an expansion.'],
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
