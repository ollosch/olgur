<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\GameDataType;
use App\Models\GameDatum;
use App\Models\GameDatumVersion;
use App\Models\ModuleVersion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GameDatumVersion>
 */
final class GameDatumVersionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'game_datum_id' => GameDatum::factory(),
            'module_version_id' => ModuleVersion::factory(),
            'type' => fake()->randomElement(GameDataType::cases()),
            'slug' => fake()->unique()->slug(2),
            'name' => fake()->words(3, true),
            'content' => ['key' => fake()->word()],
        ];
    }
}
