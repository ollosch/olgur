<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Module;
use App\Models\ModuleDraftChange;
use App\Models\Rule;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ModuleDraftChange>
 */
final class ModuleDraftChangeFactory extends Factory
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
            'module_version_id' => null,
            'entity_type' => 'rule',
            'entity_id' => Rule::factory(),
            'change_type' => 'update',
            'description' => null,
            'content_after' => ['content' => fake()->paragraph()],
            'changed_by' => User::factory(),
            'changed_at' => now(),
        ];
    }
}
