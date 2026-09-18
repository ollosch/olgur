<?php

declare(strict_types=1);

namespace App\Actions;

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
    }
}
