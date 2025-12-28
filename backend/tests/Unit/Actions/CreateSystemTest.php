<?php

declare(strict_types=1);

use App\Actions\CreateSystem;
use App\Models\Module;
use App\Models\User;

test('creates a \'core\' module when a system is created', function (): void {
    $system = (new CreateSystem())->execute(
        user: User::factory()->create(),
        data: [
            'name' => 'New System',
            'description' => 'Description of the new system.',
        ]
    )->refresh();

    expect($system->modules)->toHaveCount(1)
        ->and($system->modules->first())->toBeInstanceOf(Module::class)
        ->and($system->modules->first()->type->value)->toBe('core');
});
