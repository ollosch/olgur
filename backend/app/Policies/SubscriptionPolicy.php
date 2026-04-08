<?php

declare(strict_types=1);

namespace App\Policies;

final class SubscriptionPolicy
{
    /**
     * Any authenticated user can list their own subscriptions.
     */
    public function viewAny(): bool
    {
        return true;
    }

    /**
     * Any authenticated user can subscribe to a module.
     */
    public function create(): bool
    {
        return true;
    }

    /**
     * Users can unsubscribe; ownership is enforced in the controller by querying
     * subscriptions scoped to the authenticated user. super_admin bypass is handled by Gate::before().
     */
    public function delete(): bool
    {
        return true;
    }
}
