<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\Membership;
use App\Models\Module;
use App\Models\User;
use Illuminate\Validation\ValidationException;

final class ActivateModule
{
    /**
     * Activate an expansion module for a user within a system.
     *
     * Enforces:
     * - Module must not be a core module (core modules are always active).
     * - User must be subscribed to the module.
     * - Always appends to active_module_ids (never clears others first).
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

        /** @var array<int, string> $activeIds */
        $activeIds = ($membership->config ?? [])['active_module_ids'] ?? [];

        if (! in_array($module->id, $activeIds, strict: true)) {
            $activeIds[] = $module->id;
        }

        $membership->config = ['active_module_ids' => $activeIds];
        $membership->save();

        return $membership;
    }
}
