<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Module;
use App\Models\Rule;
use App\Models\Subscription;
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
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    $url = str_replace(['{system}', '{module}', '{rule}'], [$system->id, $module->id, $rule->id], $path);

    $this->$method($url)->assertUnauthorized();
})->with([
    'index' => ['getJson',    '/api/systems/{system}/modules/{module}/rules'],
    'store' => ['postJson',   '/api/systems/{system}/modules/{module}/rules'],
    'show' => ['getJson',    '/api/systems/{system}/modules/{module}/rules/{rule}'],
    'update' => ['patchJson',  '/api/systems/{system}/modules/{module}/rules/{rule}'],
    'destroy' => ['deleteJson', '/api/systems/{system}/modules/{module}/rules/{rule}'],
]);

// ── index ────────────────────────────────────────────────────────────────────

test('index returns rules for the module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Rule::factory()->for($module)->count(3)->create();

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules')
        ->assertSuccessful();

    expect($response->json('data'))->toHaveCount(3);
});

test('index returns rules ordered by sort_order', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Rule::factory()->for($module)->create(['number' => 'C', 'sort_order' => 30]);
    Rule::factory()->for($module)->create(['number' => 'A', 'sort_order' => 10]);
    Rule::factory()->for($module)->create(['number' => 'B', 'sort_order' => 20]);

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules')
        ->assertSuccessful();

    $numbers = collect($response->json('data'))->pluck('number')->all();
    expect($numbers)->toBe(['A', 'B', 'C']);
});

test('index does not return rules from other modules', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $other = Module::factory()->for($system)->create();
    Rule::factory()->for($other)->count(2)->create();

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules')
        ->assertSuccessful();

    expect($response->json('data'))->toBeEmpty();
});

// ── store ────────────────────────────────────────────────────────────────────

test('store creates a rule within a module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    $payload = [
        'number' => 'A.1',
        'title' => 'First Rule',
        'content' => 'The content.',
        'sort_order' => 1,
    ];

    $response = postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules', $payload)
        ->assertCreated();

    $response->assertJsonPath('data.number', 'A.1');
    $response->assertJsonPath('data.title', 'First Rule');
    $response->assertJsonPath('data.module_id', $module->id);

    assertDatabaseHas('rules', ['number' => 'A.1', 'module_id' => $module->id]);
});

test('store requires number and title', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['number', 'title']);
});

test('store rejects duplicate number within the same module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Rule::factory()->for($module)->create(['number' => 'A.1']);

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules', ['number' => 'A.1', 'title' => 'Duplicate'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['number']);
});

test('store allows same number in a different module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    Rule::factory()->for($moduleB)->create(['number' => 'A.1']);

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$moduleA->id.'/rules', ['number' => 'A.1', 'title' => 'OK', 'content' => 'Rule content.', 'sort_order' => 1])
        ->assertCreated();
});

test('store rejects cross-module duplicate for core module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $coreModule = Module::factory()->for($system)->create(['is_core' => true]);
    $otherModule = Module::factory()->for($system)->create(['is_core' => false]);
    Rule::factory()->for($otherModule)->create(['number' => 'A1.1']);

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$coreModule->id.'/rules', ['number' => 'A1.1', 'title' => 'Dup'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['number']);
});

test('store rejects cross-module duplicate when allow_concurrent_expansions is true', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create(['config' => ['system_structure' => 'core_plus_many']]);
    $moduleA = Module::factory()->for($system)->create(['is_core' => false]);
    $moduleB = Module::factory()->for($system)->create(['is_core' => false]);
    Rule::factory()->for($moduleA)->create(['number' => 'A1.1']);

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$moduleB->id.'/rules', ['number' => 'A1.1', 'title' => 'Dup'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['number']);
});

test('store accepts cross-module duplicate for non-core module when allow_concurrent_expansions is false', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create(['config' => ['system_structure' => 'grouping_only']]);
    $moduleA = Module::factory()->for($system)->create(['is_core' => false]);
    $moduleB = Module::factory()->for($system)->create(['is_core' => false]);
    Rule::factory()->for($moduleA)->create(['number' => 'A1.1']);

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$moduleB->id.'/rules', ['number' => 'A1.1', 'title' => 'Dup', 'content' => 'Rule content.', 'sort_order' => 1])
        ->assertCreated();
});

test('store rejects invalid parent_id from a different module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $other = Module::factory()->for($system)->create();
    $foreignParent = Rule::factory()->for($other)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules', [
        'number' => 'A.1',
        'title' => 'Child',
        'parent_id' => $foreignParent->id,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['parent_id']);
});

test('store accepts valid parent_id within the same module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $parent = Rule::factory()->for($module)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules', [
        'number' => 'A.1.1',
        'title' => 'Child Rule',
        'parent_id' => $parent->id,
        'content' => 'Child rule content.',
        'sort_order' => 1,
    ])
        ->assertCreated()
        ->assertJsonPath('data.parent_id', $parent->id);
});

// ── show ─────────────────────────────────────────────────────────────────────

test('show returns a single rule', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();

    actingAs($user);

    $response = getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id)
        ->assertSuccessful();

    $response->assertJsonPath('data.id', $rule->id);
    $response->assertJsonPath('data.module_id', $module->id);
});

test('show returns 404 for rule belonging to a different module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $other = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($other)->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id)
        ->assertNotFound();
});

// ── update ───────────────────────────────────────────────────────────────────

test('update modifies a rule', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();

    actingAs($user);

    $response = patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'parent_id' => $rule->parent_id,
        'number' => $rule->number,
        'title' => 'Updated Title',
        'content' => $rule->content,
        'sort_order' => $rule->sort_order,
    ])
        ->assertSuccessful();

    $response->assertJsonPath('data.title', 'Updated Title');
    assertDatabaseHas('rules', ['id' => $rule->id, 'title' => 'Updated Title']);
});

test('update rejects cross-module duplicate for core module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $coreModule = Module::factory()->for($system)->create(['is_core' => true]);
    $otherModule = Module::factory()->for($system)->create(['is_core' => false]);
    Rule::factory()->for($otherModule)->create(['number' => 'A1.1']);
    $coreRule = Rule::factory()->for($coreModule)->create(['number' => 'B1.1']);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$coreModule->id.'/rules/'.$coreRule->id, ['number' => 'A1.1'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['number']);
});

test('update rejects cross-module duplicate when allow_concurrent_expansions is true', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create(['config' => ['system_structure' => 'core_plus_many']]);
    $moduleA = Module::factory()->for($system)->create(['is_core' => false]);
    $moduleB = Module::factory()->for($system)->create(['is_core' => false]);
    Rule::factory()->for($moduleA)->create(['number' => 'A1.1']);
    $ruleB = Rule::factory()->for($moduleB)->create(['number' => 'B1.1']);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$moduleB->id.'/rules/'.$ruleB->id, ['number' => 'A1.1'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['number']);
});

test('update allows cross-module duplicate for non-core module when allow_concurrent_expansions is false', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create(['config' => ['system_structure' => 'grouping_only']]);
    $moduleA = Module::factory()->for($system)->create(['is_core' => false]);
    $moduleB = Module::factory()->for($system)->create(['is_core' => false]);
    Rule::factory()->for($moduleA)->create(['number' => 'A1.1']);
    $ruleB = Rule::factory()->for($moduleB)->create(['number' => 'B1.1']);

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$moduleB->id.'/rules/'.$ruleB->id, [
        'parent_id' => $ruleB->parent_id,
        'number' => 'A1.1',
        'title' => $ruleB->title,
        'content' => $ruleB->content,
        'sort_order' => $ruleB->sort_order,
    ])
        ->assertOk();
});

test('update returns 404 for rule belonging to a different module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $other = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($other)->create();

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, ['title' => 'Hacked'])
        ->assertNotFound();
});

// ── destroy ──────────────────────────────────────────────────────────────────

test('destroy deletes a rule', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id)
        ->assertNoContent();

    assertDatabaseMissing('rules', ['id' => $rule->id]);
});

test('destroy returns 404 for rule belonging to a different module', function (): void {
    $user = User::factory()->superAdmin()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $other = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($other)->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id)
        ->assertNotFound();
});

// ── authorization ────────────────────────────────────────────────────────────

test('regular user cannot list rules', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules')
        ->assertForbidden();
});

test('regular user cannot view a rule', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id)
        ->assertForbidden();
});

test('regular user cannot create a rule', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules', ['number' => 'A.1', 'title' => 'Test', 'content' => 'Content.', 'sort_order' => 1])
        ->assertForbidden();
});

test('regular user cannot update a rule', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'parent_id' => $rule->parent_id,
        'number' => $rule->number,
        'title' => 'Hacked',
        'content' => $rule->content,
        'sort_order' => $rule->sort_order,
    ])
        ->assertForbidden();
});

test('regular user cannot delete a rule', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id)
        ->assertForbidden();
});

// ── module subscriber authorization ──────────────────────────────────────────

test('module subscriber can list rules', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules')
        ->assertSuccessful();
});

test('module subscriber can view a rule', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    getJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id)
        ->assertSuccessful();
});

test('module subscriber cannot create a rule', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules', ['number' => 'A.1', 'title' => 'Test', 'content' => 'Content.', 'sort_order' => 1])
        ->assertForbidden();
});

test('module subscriber cannot update a rule', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'parent_id' => $rule->parent_id,
        'number' => $rule->number,
        'title' => 'Hacked',
        'content' => $rule->content,
        'sort_order' => $rule->sort_order,
    ])
        ->assertForbidden();
});

test('module subscriber cannot delete a rule', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    Subscription::factory()->for($user)->for($module)->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id)
        ->assertForbidden();
});

// ── editor authorization ───────────────────────────────────────────────────────

test('module editor can create a rule in their module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules', ['number' => 'E.1', 'title' => 'Editor Rule', 'content' => 'Editor rule content.', 'sort_order' => 1])
        ->assertCreated();
});

test('module editor of module A cannot create a rule in module B', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    Subscription::factory()->for($user)->for($moduleA)->editor()->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$moduleB->id.'/rules', ['number' => 'E.1', 'title' => 'Editor Rule', 'content' => 'Editor rule content.', 'sort_order' => 1])
        ->assertForbidden();
});

test('module editor can update a rule in their module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'parent_id' => $rule->parent_id,
        'number' => $rule->number,
        'title' => 'Editor Updated',
        'content' => $rule->content,
        'sort_order' => $rule->sort_order,
    ])
        ->assertSuccessful();
});

test('module editor cannot update a rule in another module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($moduleB)->create();
    Subscription::factory()->for($user)->for($moduleA)->editor()->create();

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$moduleB->id.'/rules/'.$rule->id, [
        'parent_id' => $rule->parent_id,
        'number' => $rule->number,
        'title' => 'Hacked',
        'content' => $rule->content,
        'sort_order' => $rule->sort_order,
    ])
        ->assertForbidden();
});

test('module editor can delete a rule in their module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    Subscription::factory()->for($user)->for($module)->editor()->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id)
        ->assertNoContent();
});

test('module editor cannot delete a rule in another module', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $moduleA = Module::factory()->for($system)->create();
    $moduleB = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($moduleB)->create();
    Subscription::factory()->for($user)->for($moduleA)->editor()->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$moduleB->id.'/rules/'.$rule->id)
        ->assertForbidden();
});

// ── system admin authorization ───────────────────────────────────────────────

test('system admin can create a rule', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    Membership::factory()->for($user)->for($system)->admin()->create();

    actingAs($user);

    postJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules', ['number' => 'A.1', 'title' => 'Admin Rule', 'content' => 'Admin rule content.', 'sort_order' => 1])
        ->assertCreated();
});

test('system admin can update a rule', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    Membership::factory()->for($user)->for($system)->admin()->create();

    actingAs($user);

    patchJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id, [
        'parent_id' => $rule->parent_id,
        'number' => $rule->number,
        'title' => 'Admin Updated',
        'content' => $rule->content,
        'sort_order' => $rule->sort_order,
    ])
        ->assertSuccessful();
});

test('system admin can delete a rule', function (): void {
    $user = User::factory()->create();
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    $rule = Rule::factory()->for($module)->create();
    Membership::factory()->for($user)->for($system)->admin()->create();

    actingAs($user);

    deleteJson('/api/systems/'.$system->id.'/modules/'.$module->id.'/rules/'.$rule->id)
        ->assertNoContent();
});
