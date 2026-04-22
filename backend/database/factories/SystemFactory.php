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
     * CorePlusMany structure: core + multiple expansions simultaneously.
     * Rule numbers are system-wide unique; subscribing to expansion requires core subscription.
     */
    public function corePlusMany(): static
    {
        return $this->state(fn (array $attributes): array => [
            'config' => ['system_structure' => 'core_plus_many'],
        ]);
    }

    /**
     * CorePlusOne structure: core + one expansion at a time.
     * Subscribing to expansion auto-subscribes to core.
     */
    public function corePlusOne(): static
    {
        return $this->state(fn (array $attributes): array => [
            'config' => ['system_structure' => 'core_plus_one'],
        ]);
    }

    /**
     * GroupingOnly structure: standalone expansions, no subscription mechanics.
     */
    public function groupingOnly(): static
    {
        return $this->state(fn (array $attributes): array => [
            'config' => ['system_structure' => 'grouping_only'],
        ]);
    }
}
