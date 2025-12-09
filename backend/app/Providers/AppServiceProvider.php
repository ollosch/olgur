<?php

declare(strict_types=1);

namespace App\Providers;

use App\Enums\PermissionList;
use App\Models\Module;
use App\Models\System;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Gate;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->bootModelsDefaults();

        JsonResource::withoutWrapping();

        $this->setEmailVerificationUrl();

        $this->setPasswordResetUrl();

        $this->bootAccessControl();
    }

    private function bootModelsDefaults(): void
    {
        Model::unguard();
    }

    private function setEmailVerificationUrl(): void
    {
        VerifyEmail::createUrlUsing(function (Authenticatable $notifiable): string {
            $signed = URL::temporarySignedRoute(
                'verification.verify',
                now()->addMinutes(60),
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1((string) $notifiable->getEmailForVerification()),
                ]
            );

            return config('app.frontend_url').'/verify-email?url='.urlencode($signed);
        });
    }

    private function setPasswordResetUrl(): void
    {
        ResetPassword::createUrlUsing(fn (Authenticatable $notifiable, string $token): string =>
            config('app.frontend_url').
            '/reset-password?token='.$token.
            '&email='.urlencode((string) $notifiable->getEmailForPasswordReset()));
    }

    private function bootAccessControl(): void
    {
        Gate::before(function (User $user, string|PermissionList $ability, array $arguments) {
            $context = $arguments[0] ?? null;
            $ability = $ability instanceof PermissionList ? $ability->value : $ability;

            if ($context === null || $context instanceof System || $context instanceof Module) {
                if ($user->hasPermissionTo($ability, $context)) {
                    return true;
                }
            }
        });
    }
}
