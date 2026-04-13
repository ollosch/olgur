<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\Membership;
use App\Models\Module;
use App\Models\User;
use Illuminate\Validation\ValidationException;

final class DeactivateModule
{
    /**
     * Deactivate an expansion module for a user within a system.
     *
     * Core modules cannot be toggled and will throw a ValidationException.
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

        /** @var array<int, string> $activeIds */
        $activeIds = ($membership->config ?? [])['active_module_ids'] ?? [];

        $activeIds = array_values(array_filter($activeIds, fn (string $id): bool => $id !== $module->id));

        $membership->config = ['active_module_ids' => $activeIds];
        $membership->save();

        return $membership;
    }
}
