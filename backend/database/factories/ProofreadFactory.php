<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Proofread;
use App\Models\Rule;
use App\Models\System;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Proofread>
 */
final class ProofreadFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'system_id' => System::factory(),
            'entity_type' => Proofread::ENTITY_TYPE_RULE,
            'entity_id' => Rule::factory(),
        ];
    }
}
