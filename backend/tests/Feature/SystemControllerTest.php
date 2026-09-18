<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\System;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertDatabaseMissing;
use function Pest\Laravel\deleteJson;
use function Pest\Laravel\getJson;
use function Pest\Laravel\patchJson;
use function Pest\Laravel\postJson;

// ── Unauthenticated ──────────────────────────────────────────────────────────

test('unauthenticated requests are rejected', function (string $method, string $path): void {
    $this->$method($path)->assertUnauthorized();
})->with([
    'index' => ['getJson',    '/api/systems'],
    'store' => ['postJson',   '/api/systems'],
    'show' => ['getJson',    '/api/systems/fake-id'],
    'update' => ['patchJson',  '/api/systems/fake-id'],
    'destroy' => ['deleteJson', '/api/systems/fake-id'],
]);

// ── index ────────────────────────────────────────────────────────────────────

test('index returns member systems ordered by name', function (): void {
    $user = User::factory()->create();
    $zebra = System::factory()->create(['name' => 'Zebra Game', 'slug' => 'zebra-game']);
    $alpha = System::factory()->create(['name' => 'Alpha Game', 'slug' => 'alpha-game']);
    System::factory()->create(['name' => 'Hidden Game', 'slug' => 'hidden-game']);
    Membership::factory()->for($user)->for($zebra)->create();
    Membership::factory()->for($user)->for($alpha)->create();

    actingAs($user);

    $response = getJson('/api/systems')
        ->assertSuccessful();

    $names = collect($response->json('data'))->pluck('name')->all();
    expect($names)->toBe(['Alpha Game', 'Zebra Game']);
});

test('index returns systems as resource collection', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Membership::factory()->for($user)->for($system)->create();

    actingAs($user);

    $response = getJson('/api/systems')
        ->assertSuccessful();

    $response->assertJsonStructure([
        'data' => [['id', 'slug', 'name', 'description', 'config', 'created_at', 'updated_at']],
    ]);

    expect($response->json('data.0.id'))->toBe($system->id);
});

// ── store ────────────────────────────────────────────────────────────────────

test('store creates a system', function (): void {
    $user = User::factory()->superAdmin()->create();
    actingAs($user);

    $payload = [
        'slug' => 'asl',
        'name' => 'Advanced Squad Leader',
        'description' => 'A tactical wargame.',
        'config' => [
            'toc_depth' => 3,
            'sort_rules_by' => 'number',
            'global_rule_numbers' => false,
        ],
    ];

    $response = postJson('/api/systems', $payload)
        ->assertCreated();

    $response->assertJsonPath('data.slug', 'asl');
    $response->assertJsonPath('data.name', 'Advanced Squad Leader');
    $response->assertJsonPath('data.config.toc_depth', 3);

    assertDatabaseHas('systems', ['slug' => 'asl']);
});

test('store requires slug and name', function (): void {
    $user = User::factory()->superAdmin()->create();
    actingAs($user);

    postJson('/api/systems', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['slug', 'name']);
});

test('store rejects duplicate slug', function (): void {
    $user = User::factory()->superAdmin()->create();
    actingAs($user);
    System::factory()->create(['slug' => 'taken']);

    postJson('/api/systems', ['slug' => 'taken', 'name' => 'Other'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['slug']);
});

test('store allows any authenticated user to create a system', function (): void {
    $user = User::factory()->create();
    actingAs($user);

    postJson('/api/systems', [
        'slug' => 'asl',
        'name' => 'ASL',
        'description' => '',
        'config' => [
            'toc_depth' => 1,
            'sort_rules_by' => 'number',
            'global_rule_numbers' => false,
        ],
    ])->assertCreated();
});

// ── show ─────────────────────────────────────────────────────────────────────

test('show returns a single system', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    Membership::factory()->for($user)->for($system)->create();
    actingAs($user);

    $response = getJson('/api/systems/'.$system->id)
        ->assertSuccessful()
        ->assertJsonPath('data.id', $system->id)
        ->assertJsonPath('data.slug', $system->slug);
});

test('show is forbidden for non-members', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    actingAs($user);

    getJson('/api/systems/'.$system->id)->assertForbidden();
});

test('show returns 404 for unknown system', function (): void {
    $user = User::factory()->create();
    actingAs($user);

    getJson('/api/systems/nonexistent-id')
        ->assertNotFound();
});

// ── update ───────────────────────────────────────────────────────────────────

test('update modifies a system', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    actingAs($user);

    patchJson('/api/systems/'.$system->id, [
        'slug' => $system->slug,
        'name' => 'Updated Name',
        'description' => $system->description,
        'config' => $system->config ?? [],
    ])
        ->assertSuccessful()
        ->assertJsonPath('data.name', 'Updated Name');

    assertDatabaseHas('systems', ['id' => $system->id, 'name' => 'Updated Name']);
});

test('update rejects duplicate slug on another system', function (): void {
    $user = User::factory()->superAdmin()->create();
    actingAs($user);
    System::factory()->create(['slug' => 'taken']);
    $other = System::factory()->create(['slug' => 'mine']);

    patchJson('/api/systems/'.$other->id, ['slug' => 'taken'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['slug']);
});

test('update allows same slug on same system', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create(['slug' => 'mine']);
    actingAs($user);

    patchJson('/api/systems/'.$system->id, [
        'slug' => 'mine',
        'name' => $system->name,
        'description' => $system->description,
        'config' => $system->config ?? [],
    ])
        ->assertSuccessful();
});

test('update is forbidden for non-super-admin', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    actingAs($user);

    patchJson('/api/systems/'.$system->id, [
        'slug' => $system->slug,
        'name' => 'Hacked',
        'description' => $system->description,
        'config' => $system->config ?? [],
    ])
        ->assertForbidden();
});

test('system admin can update their system', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    actingAs($admin);

    patchJson('/api/systems/'.$system->id, [
        'slug' => $system->slug,
        'name' => 'Admin Updated',
        'description' => $system->description,
        'config' => $system->config ?? [],
    ])
        ->assertOk()
        ->assertJsonPath('data.name', 'Admin Updated');
});

// ── destroy ───────────────────────────────────────────────────────────────────

test('destroy deletes a system', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    actingAs($user);

    deleteJson('/api/systems/'.$system->id)
        ->assertNoContent();

    assertDatabaseMissing('systems', ['id' => $system->id]);
});

test('destroy returns 404 for unknown system', function (): void {
    $user = User::factory()->superAdmin()->create();
    actingAs($user);

    deleteJson('/api/systems/nonexistent-id')
        ->assertNotFound();
});

test('destroy is forbidden for non-super-admin', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    actingAs($user);

    deleteJson('/api/systems/'.$system->id)
        ->assertForbidden();
});

test('system admin can delete their system', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    actingAs($admin);

    deleteJson('/api/systems/'.$system->id)
        ->assertNoContent();

    assertDatabaseMissing('systems', ['id' => $system->id]);
});

// ── config fields ─────────────────────────────────────────────────────────────

test('store accepts sort_rules_by in config', function (): void {
    $user = User::factory()->superAdmin()->create();
    actingAs($user);

    $response = postJson('/api/systems', [
        'slug' => 'asl',
        'name' => 'ASL',
        'description' => '',
        'config' => [
            'toc_depth' => 1,
            'sort_rules_by' => 'number',
            'global_rule_numbers' => false,
        ],
    ])->assertCreated();

    expect($response->json('data.config.sort_rules_by'))->toBe('number');
});

test('store rejects invalid sort_rules_by value', function (): void {
    $user = User::factory()->superAdmin()->create();
    actingAs($user);

    postJson('/api/systems', [
        'slug' => 'asl',
        'name' => 'ASL',
        'config' => [
            'toc_depth' => 1,
            'sort_rules_by' => 'invalid',
            'global_rule_numbers' => false,
        ],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['config.sort_rules_by']);
});

test('update ignores sort_rules_by — it is immutable', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create(['config' => ['sort_rules_by' => 'number']]);
    actingAs($user);

    patchJson('/api/systems/'.$system->id, [
        'slug' => $system->slug,
        'name' => $system->name,
        'description' => $system->description,
        'config' => ['sort_rules_by' => 'sort_order'],
    ])->assertSuccessful()
        ->assertJsonPath('data.config.sort_rules_by', 'number');
});

test('update ignores invalid sort_rules_by — it is not validated', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create(['config' => ['sort_rules_by' => 'number']]);
    actingAs($user);

    patchJson('/api/systems/'.$system->id, [
        'slug' => $system->slug,
        'name' => $system->name,
        'description' => $system->description,
        'config' => ['sort_rules_by' => 'bad'],
    ])->assertSuccessful()
        ->assertJsonPath('data.config.sort_rules_by', 'number');
});

test('store accepts global_rule_numbers in config', function (): void {
    $user = User::factory()->superAdmin()->create();
    actingAs($user);

    $response = postJson('/api/systems', [
        'slug' => 'rcs',
        'name' => 'RCS',
        'description' => '',
        'config' => [
            'toc_depth' => 1,
            'sort_rules_by' => 'number',
            'global_rule_numbers' => true,
        ],
    ])->assertCreated();

    expect($response->json('data.config.global_rule_numbers'))->toBeTrue();
});

test('store accepts global_rule_numbers when false', function (): void {
    $user = User::factory()->superAdmin()->create();
    actingAs($user);

    $response = postJson('/api/systems', [
        'slug' => 'ace',
        'name' => 'ACE',
        'description' => '',
        'config' => [
            'toc_depth' => 1,
            'sort_rules_by' => 'number',
            'global_rule_numbers' => false,
        ],
    ])->assertCreated();

    expect($response->json('data.config.global_rule_numbers'))->toBeFalse();
});

test('store rejects invalid global_rule_numbers', function (): void {
    $user = User::factory()->superAdmin()->create();
    actingAs($user);

    postJson('/api/systems', [
        'slug' => 'bad',
        'name' => 'Bad',
        'description' => '',
        'config' => [
            'toc_depth' => 1,
            'sort_rules_by' => 'number',
            'global_rule_numbers' => 'invalid',
        ],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['config.global_rule_numbers']);
});

test('update ignores global_rule_numbers — it is immutable', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create(['config' => ['global_rule_numbers' => false]]);
    actingAs($user);

    patchJson('/api/systems/'.$system->id, [
        'slug' => $system->slug,
        'name' => $system->name,
        'description' => $system->description,
        'config' => ['global_rule_numbers' => true],
    ])->assertSuccessful()
        ->assertJsonPath('data.config.global_rule_numbers', false);
});

// ── creator auto-membership ───────────────────────────────────────────────────

test('store creates an admin membership for the creator', function (): void {
    $user = User::factory()->create();
    actingAs($user);

    $response = postJson('/api/systems', [
        'slug' => 'my-system',
        'name' => 'My System',
        'description' => '',
        'config' => [
            'global_rule_numbers' => false,
            'toc_depth' => 1,
            'sort_rules_by' => 'sort_order',
        ],
    ])->assertCreated();

    $systemId = $response->json('data.id');

    assertDatabaseHas('memberships', [
        'user_id' => $user->id,
        'system_id' => $systemId,
        'admin' => true,
    ]);
});

// ── auto core module ──────────────────────────────────────────────────────────

test('store auto-creates a core module when global_rule_numbers is false', function (): void {
    $user = User::factory()->create();
    actingAs($user);

    $response = postJson('/api/systems', [
        'slug' => 'my-system',
        'name' => 'My System',
        'description' => '',
        'config' => [
            'global_rule_numbers' => false,
            'toc_depth' => 1,
            'sort_rules_by' => 'sort_order',
        ],
    ])->assertCreated();

    $systemId = $response->json('data.id');
    $system = System::query()->find($systemId);

    expect($system)->not->toBeNull();

    /** @var System $system */
    $coreModule = $system->modules()->where('is_core', true)->first();

    expect($coreModule)->not->toBeNull()
        ->and($coreModule->name)->toBe('Core')
        ->and($coreModule->slug)->toBe('core');

    assertDatabaseHas('subscriptions', [
        'user_id' => $user->id,
        'module_id' => $coreModule->id,
        'editor' => true,
    ]);
});

test('store auto-creates a core module when global_rule_numbers is true', function (): void {
    $user = User::factory()->create();
    actingAs($user);

    $response = postJson('/api/systems', [
        'slug' => 'my-system',
        'name' => 'My System',
        'description' => '',
        'config' => [
            'global_rule_numbers' => true,
            'toc_depth' => 1,
            'sort_rules_by' => 'sort_order',
        ],
    ])->assertCreated();

    $systemId = $response->json('data.id');
    $system = System::query()->find($systemId);

    expect($system)->not->toBeNull();

    /** @var System $system */
    $coreModule = $system->modules()->where('is_core', true)->first();

    expect($coreModule)->not->toBeNull();

    assertDatabaseHas('subscriptions', [
        'user_id' => $user->id,
        'module_id' => $coreModule->id,
        'editor' => true,
    ]);
});

test('store auto-creates a core module when config is omitted', function (): void {
    $user = User::factory()->create();
    actingAs($user);

    $response = postJson('/api/systems', [
        'slug' => 'my-system',
        'name' => 'My System',
        'description' => '',
        'config' => [
            'toc_depth' => 1,
            'sort_rules_by' => 'sort_order',
        ],
    ])->assertCreated();

    $systemId = $response->json('data.id');
    $system = System::query()->find($systemId);

    expect($system)->not->toBeNull();

    /** @var System $system */
    expect($system->modules()->where('is_core', true)->exists())->toBeTrue();
});
