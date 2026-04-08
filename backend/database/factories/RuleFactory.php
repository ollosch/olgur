<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Module;
use App\Models\Rule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Rule>
 */
final class RuleFactory extends Factory
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
            'parent_id' => null,
            'number' => fake()->unique()->bothify('?.###'),
            'title' => fake()->sentence(4),
            'content' => fake()->paragraph(),
            'sort_order' => fake()->numberBetween(0, 100),
        ];
    }
}
