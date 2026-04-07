<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Membership;
use App\Models\System;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Membership>
 */
final class MembershipFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'system_id' => System::factory(),
            'admin' => false,
        ];
    }

    /**
     * Mark this membership as a system admin.
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes): array => [
            'admin' => true,
        ]);
    }
}
