<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Module;
use App\Models\ModuleVersion;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ModuleVersion>
 */
final class ModuleVersionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'module_id' => Module::factory(),
            'version_string' => fake()->bothify('v#.#.#'),
            'notes' => fake()->optional(0.5)->sentence(),
            'released_at' => null,
            'released_by' => null,
        ];
    }

    /**
     * Mark this version as released.
     */
    public function released(): static
    {
        return $this->state(fn (array $attributes): array => [
            'released_at' => now(),
            'released_by' => User::factory(),
        ]);
    }
}
