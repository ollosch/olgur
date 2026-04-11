<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ModuleVersion;
use App\Models\Rule;
use App\Models\RuleVersion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RuleVersion>
 */
final class RuleVersionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'rule_id' => Rule::factory(),
            'module_version_id' => ModuleVersion::factory(),
            'parent_id' => null,
            'number' => fake()->bothify('?.#.#'),
            'title' => fake()->sentence(3),
            'content' => fake()->optional(0.7)->paragraph(),
            'sort_order' => fake()->numberBetween(0, 100),
        ];
    }
}
