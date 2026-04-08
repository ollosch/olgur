<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Module;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Subscription>
 */
final class SubscriptionFactory extends Factory
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
            'module_id' => Module::factory(),
            'editor' => false,
        ];
    }

    /**
     * Mark this subscription as having editor rights.
     */
    public function editor(): static
    {
        return $this->state(fn (array $attributes): array => [
            'editor' => true,
        ]);
    }
}
