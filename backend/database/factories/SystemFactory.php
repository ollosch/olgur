<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\System;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<System>
 */
final class SystemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        /** @var string $name */
        $name = fake()->unique()->words(3, true);

        return [
            'slug' => Str::slug($name),
            'name' => Str::title($name),
            'description' => fake()->sentence(),
            'config' => null,
        ];
    }

    /**
     * Set a toc_depth config value.
     */
    public function withTocDepth(int $depth): static
    {
        return $this->state(fn (array $attributes): array => [
            'config' => ['toc_depth' => $depth],
        ]);
    }

    /**
     * Require a core subscription before subscribing to expansion modules.
     */
    public function requireCoreSubscription(): static
    {
        return $this->state(fn (array $attributes): array => [
            'config' => ['require_core_subscription' => true],
        ]);
    }

    /**
     * Allow multiple expansion modules to be active concurrently.
     */
    public function allowConcurrentExpansions(): static
    {
        return $this->state(fn (array $attributes): array => [
            'config' => ['allow_concurrent_expansions' => true],
        ]);
    }
}
