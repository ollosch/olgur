<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Module;
use App\Models\Version;
use App\Services\VersionService;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Version>
 */
final class VersionFactory extends Factory
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
            'name' => $this->faker->word(),
            'filepath' => $this->faker->filePath(),
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (Version $version) {
            $version->update([
                'filepath' => (new VersionService())->generateFilePath($version->module),
            ]);
        });
    }
}
