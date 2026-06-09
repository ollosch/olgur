<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ModuleVersion;
use App\Models\ModuleVersionAmendment;
use App\Models\RuleVersion;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ModuleVersionAmendment>
 */
final class ModuleVersionAmendmentFactory extends Factory
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
            'entity_id' => RuleVersion::factory(),
            'change_type' => fake()->randomElement(['correction', 'update']),
            'description' => fake()->sentence(),
            'content_after' => ['content' => fake()->paragraph()],
            'amended_by' => User::factory(),
            'amended_at' => now(),
        ];
    }
}
