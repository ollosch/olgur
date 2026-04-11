<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\IndexEntry;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<IndexEntry>
 */
final class IndexEntryFactory extends Factory
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
            'term' => fake()->unique()->word(),
            'definition' => fake()->sentence(),
            'notes' => null,
            'relations' => null,
        ];
    }
}
