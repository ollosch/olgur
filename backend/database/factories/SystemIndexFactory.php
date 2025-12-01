<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\System;
use App\Models\SystemIndex;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SystemIndex>
 */
final class SystemIndexFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'system_id' => System::factory(),
            'term' => $this->faker->word(),
            'definition' => $this->faker->sentence(),
            'references' => '',
            'links' => $this->faker->lexify('?')
                . '.00' . $this->faker->randomDigitNotNull()
                . '.00' . $this->faker->randomDigitNotNull()
        ];
    }
}
