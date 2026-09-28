<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Module;
use App\Models\ModuleVersion;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;

/**
 * @return array<string, bool>
 */
function modulePermissions(System $system, Module $module): array
{
    return getJson('/api/systems/'.$system->id.'/modules')
        ->json('data.0.permissions');
}

// ── Module-level permission maps ──────────────────────────────────────────────

test('a super admin receives every module permission', function (): void {
    $system = System::factory()->create();
    $module = Module::factory()->for($system)->create();
    ModuleVersion::factory()->for($module)->released()->create();
    actingAs(User::factory()->superAdmin()->create());

    $permissions = modulePermissions($system, $module);

    expect($permissions)->toBe([
        'module.update' => true,
        'module.delete' => true,
        'content.view_live' => true,
        'content.view_released' => true,
        'content.edit' => true,
        'content.proofread' => true,
        'version.publish' => true,
        'version.amend_latest' => true,
        'subscription.manage' => true,
    ]);
});

test('a system admin sees management permissions for a module', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    $module = Module::factory()->for($system)->create();
    ModuleVersion::factory()->for($module)->released()->create();
    actingAs($admin);

    $permissions = modulePermissions($system, $module);

    expect($permissions['module.update'])->toBeTrue()
        ->and($permissions['module.delete'])->toBeTrue()
        ->and($permissions['content.view_live'])->toBeTrue()
        ->and($permissions['content.view_released'])->toBeTrue()
        ->and($permissions['content.edit'])->toBeTrue()
        ->and($permissions['version.publish'])->toBeTrue()
        ->and($permissions['version.amend_latest'])->toBeTrue()
        ->and($permissions['subscription.manage'])->toBeTrue();
});

test('a module editor loads live content and can publish but cannot manage subscriptions', function (): void {
    $system = System::factory()->create();
    $editor = User::factory()->create();
    Membership::factory()->for($editor)->for($system)->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($editor)->for($module)->editor()->create();
    ModuleVersion::factory()->for($module)->released()->create();
    actingAs($editor);

    $permissions = modulePermissions($system, $module);

    expect($permissions['content.view_live'])->toBeTrue()
        ->and($permissions['content.edit'])->toBeTrue()
        ->and($permissions['module.update'])->toBeTrue()
        ->and($permissions['version.publish'])->toBeTrue()
        ->and($permissions['version.amend_latest'])->toBeTrue()
        ->and($permissions['module.delete'])->toBeFalse()
        ->and($permissions['subscription.manage'])->toBeFalse()
        ->and($permissions['content.view_released'])->toBeTrue();
});

test('a proofreader can proofread content but cannot manage it', function (): void {
    $system = System::factory()->create();
    $proofreader = User::factory()->create();
    Membership::factory()->for($proofreader)->for($system)->proofreader()->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($proofreader)->for($module)->create(['editor' => false]);
    actingAs($proofreader);

    $permissions = modulePermissions($system, $module);

    expect($permissions['content.proofread'])->toBeTrue()
        ->and($permissions['content.view_live'])->toBeFalse()
        ->and($permissions['content.edit'])->toBeFalse();
});

test('a plain subscriber reads released content but cannot view or edit live content', function (): void {
    $system = System::factory()->create();
    $subscriber = User::factory()->create();
    Membership::factory()->for($subscriber)->for($system)->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($subscriber)->for($module)->create(['editor' => false]);
    ModuleVersion::factory()->for($module)->released()->create();
    actingAs($subscriber);

    $permissions = modulePermissions($system, $module);

    expect($permissions['content.view_live'])->toBeFalse()
        ->and($permissions['content.view_released'])->toBeTrue()
        ->and($permissions['content.edit'])->toBeFalse()
        ->and($permissions['content.proofread'])->toBeFalse()
        ->and($permissions['module.update'])->toBeFalse()
        ->and($permissions['version.publish'])->toBeFalse()
        ->and($permissions['module.delete'])->toBeFalse()
        ->and($permissions['subscription.manage'])->toBeFalse();
});

test('a subscriber cannot read released content from a module without a snapshot', function (): void {
    $system = System::factory()->create();
    $subscriber = User::factory()->create();
    Membership::factory()->for($subscriber)->for($system)->create();
    $module = Module::factory()->for($system)->create();
    Subscription::factory()->for($subscriber)->for($module)->create(['editor' => false]);
    actingAs($subscriber);

    $permissions = modulePermissions($system, $module);

    expect($permissions['content.view_live'])->toBeFalse()
        ->and($permissions['content.view_released'])->toBeFalse();
});

test('a member without a subscription receives no content permissions', function (): void {
    $system = System::factory()->create();
    $member = User::factory()->create();
    Membership::factory()->for($member)->for($system)->create();
    $module = Module::factory()->for($system)->create();
    ModuleVersion::factory()->for($module)->released()->create();
    actingAs($member);

    $permissions = modulePermissions($system, $module);

    expect($permissions['content.view_live'])->toBeFalse()
        ->and($permissions['content.view_released'])->toBeFalse()
        ->and($permissions['content.edit'])->toBeFalse();
});

// ── System-level permission maps ──────────────────────────────────────────────

test('a system payload exposes admin permissions for a system admin', function (): void {
    $system = System::factory()->create();
    $admin = User::factory()->create();
    Membership::factory()->for($admin)->for($system)->admin()->create();
    actingAs($admin);

    $permissions = getJson('/api/systems/'.$system->id)->json('data.permissions');

    expect($permissions)->toBe([
        'system.manage' => true,
        'membership.manage' => true,
        'module.create' => true,
    ]);
});

test('a system payload exposes no admin permissions for a regular member', function (): void {
    $system = System::factory()->create();
    $member = User::factory()->create();
    Membership::factory()->for($member)->for($system)->create();
    actingAs($member);

    $permissions = getJson('/api/systems/'.$system->id)->json('data.permissions');

    expect($permissions)->toBe([
        'system.manage' => false,
        'membership.manage' => false,
        'module.create' => false,
    ]);
});

test('a super admin receives every system permission', function (): void {
    $system = System::factory()->create();
    actingAs(User::factory()->superAdmin()->create());

    $permissions = getJson('/api/systems/'.$system->id)->json('data.permissions');

    expect($permissions)->toBe([
        'system.manage' => true,
        'membership.manage' => true,
        'module.create' => true,
    ]);
});
