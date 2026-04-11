<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\IndexEntry;
use App\Models\IndexEntryVersion;
use App\Models\ModuleVersion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<IndexEntryVersion>
 */
final class IndexEntryVersionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'index_entry_id' => IndexEntry::factory(),
            'module_version_id' => ModuleVersion::factory(),
            'parent_id' => null,
            'term' => fake()->word(),
            'definition' => fake()->optional(0.7)->sentence(),
            'notes' => fake()->optional(0.5)->paragraph(),
            'relations' => null,
        ];
    }
}
