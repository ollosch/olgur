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

test('index returns all systems ordered by name', function (): void {
    $user = User::factory()->create();
    System::factory()->create(['name' => 'Zebra Game', 'slug' => 'zebra-game']);
    System::factory()->create(['name' => 'Alpha Game', 'slug' => 'alpha-game']);

    actingAs($user);

    $response = getJson('/api/systems')
        ->assertSuccessful();

    $names = collect($response->json('data'))->pluck('name')->all();
    expect($names)->toBe(['Alpha Game', 'Zebra Game']);
});

test('index returns systems as resource collection', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();

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
            'system_structure' => 'grouping_only',
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
            'system_structure' => 'grouping_only',
        ],
    ])->assertCreated();
});

// ── show ─────────────────────────────────────────────────────────────────────

test('show returns a single system', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    actingAs($user);

    $response = getJson('/api/systems/'.$system->id)
        ->assertSuccessful()
        ->assertJsonPath('data.id', $system->id)
        ->assertJsonPath('data.slug', $system->slug);
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
            'system_structure' => 'grouping_only',
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
            'system_structure' => 'grouping_only',
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

test('store accepts system_structure in config', function (): void {
    $user = User::factory()->superAdmin()->create();
    actingAs($user);

    $response = postJson('/api/systems', [
        'slug' => 'rcs',
        'name' => 'RCS',
        'description' => '',
        'config' => [
            'toc_depth' => 1,
            'sort_rules_by' => 'number',
            'system_structure' => 'core_plus_many',
        ],
    ])->assertCreated();

    expect($response->json('data.config.system_structure'))->toBe('core_plus_many');
});

test('store accepts core_plus_many structure', function (): void {
    $user = User::factory()->superAdmin()->create();
    actingAs($user);

    $response = postJson('/api/systems', [
        'slug' => 'ace',
        'name' => 'ACE',
        'description' => '',
        'config' => [
            'toc_depth' => 1,
            'sort_rules_by' => 'number',
            'system_structure' => 'core_plus_many',
        ],
    ])->assertCreated();

    expect($response->json('data.config.system_structure'))->toBe('core_plus_many');
});

test('store rejects invalid system_structure', function (): void {
    $user = User::factory()->superAdmin()->create();
    actingAs($user);

    postJson('/api/systems', [
        'slug' => 'bad',
        'name' => 'Bad',
        'description' => '',
        'config' => [
            'toc_depth' => 1,
            'sort_rules_by' => 'number',
            'system_structure' => 'invalid',
        ],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['config.system_structure']);
});

test('update ignores system_structure — it is immutable', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create(['config' => ['system_structure' => 'grouping_only']]);
    actingAs($user);

    patchJson('/api/systems/'.$system->id, [
        'slug' => $system->slug,
        'name' => $system->name,
        'description' => $system->description,
        'config' => ['system_structure' => 'core_plus_many'],
    ])->assertSuccessful()
        ->assertJsonPath('data.config.system_structure', 'grouping_only');
});
