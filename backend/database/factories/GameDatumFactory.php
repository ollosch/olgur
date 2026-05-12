<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\GameDataType;
use App\Models\GameDatum;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GameDatum>
 */
final class GameDatumFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'module_id' => Module::factory(),
            'type' => fake()->randomElement(GameDataType::cases()),
            'slug' => fake()->unique()->slug(2),
            'name' => fake()->words(3, true),
            'content' => ['key' => fake()->word()],
        ];
    }
}
