<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

final class EmailVerificationNotificationController
{
    /**
     * Send a new email verification notification.
     */
    public function store(#[CurrentUser] User $user): JsonResponse
    {
        if ($user->hasVerifiedEmail()) {
            return response()->json(['status' => 'Email already verified']);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['status' => 'Verification link sent']);
    }
}
