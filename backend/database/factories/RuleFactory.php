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
            'mpath' => $this->faker->lexify('?')
                . '.0' . $this->faker->randomNumber(2, true)
                . '.0' . $this->faker->randomNumber(2, true),
            'title' => $this->faker->words(3, true),
            'content' => $this->faker->paragraphs(3, true),
        ];
    }
}
