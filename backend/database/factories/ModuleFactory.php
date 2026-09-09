<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Module;
use App\Models\System;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Module>
 */
final class ModuleFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        /** @var string $name */
        $name = fake()->unique()->words(3, true);

        return [
            'system_id' => System::factory(),
            'slug' => Str::slug($name),
            'name' => Str::title($name),
            'description' => fake()->sentence(),
            'config' => [],
            'is_core' => false,
            'sort_order' => fake()->numberBetween(0, 100),
            'draft_revision' => 0,
        ];
    }

    /**
     * Mark this module as the core module for its system.
     */
    public function core(): static
    {
        return $this->state(fn (array $attributes): array => [
            'is_core' => true,
            'sort_order' => 0,
        ]);
    }
}
