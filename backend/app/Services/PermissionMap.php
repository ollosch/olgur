<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Module;
use App\Models\System;
use App\Models\User;

/**
 * Computes the current-user permission map exposed to the frontend.
 *
 * Backend policies remain the authoritative source of truth for every request;
 * this map is a read-only projection of the same role facts, serialized so the
 * frontend can gate actions and choose each module's content source without
 * inspecting role flags itself.
 */
final class PermissionMap
{
    /**
     * System-level permissions for the given user.
     *
     * @return array<string, bool>
     */
    public function system(User $user, System $system): array
    {
        $isAdmin = $user->super_admin || $system->isAdmin($user);

        return [
            'system.manage' => $isAdmin,
            'membership.manage' => $isAdmin,
            'module.create' => $isAdmin,
        ];
    }

    /**
     * Module-level permissions for the given user.
     *
     * @return array<string, bool>
     */
    public function module(User $user, System $system, Module $module): array
    {
        if ($user->super_admin) {
            return $this->allModulePermissions(true);
        }

        $isAdmin = $system->isAdmin($user);
        $isEditor = $module->isEditor($user);
        $isSubscriber = $module->isSubscriber($user);
        $canViewLive = $isAdmin || $isEditor;
        $hasReleasedSnapshot = $module->versions()->whereNotNull('released_at')->exists();

        return [
            'module.update' => $canViewLive,
            'module.delete' => $isAdmin,
            'content.view_live' => $canViewLive,
            'content.view_released' => $hasReleasedSnapshot && ($isSubscriber || $isAdmin),
            'content.edit' => $canViewLive,
            'version.publish' => $canViewLive,
            'version.amend_latest' => $canViewLive,
            'subscription.manage' => $isAdmin,
            'module.activate' => $isSubscriber && $system->isMember($user),
        ];
    }

    /**
     * @return array<string, bool>
     */
    private function allModulePermissions(bool $value): array
    {
        return [
            'module.update' => $value,
            'module.delete' => $value,
            'content.view_live' => $value,
            'content.view_released' => $value,
            'content.edit' => $value,
            'version.publish' => $value,
            'version.amend_latest' => $value,
            'subscription.manage' => $value,
            'module.activate' => $value,
        ];
    }
}
