<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ModuleVersion;
use App\Models\ModuleVersionReleaseNote;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ModuleVersionReleaseNote>
 */
final class ModuleVersionReleaseNoteFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'module_version_id' => ModuleVersion::factory(),
            'entity_type' => 'rule',
            'entity_id' => (string) Str::ulid(),
            'note' => fake()->sentence(),
        ];
    }
}
