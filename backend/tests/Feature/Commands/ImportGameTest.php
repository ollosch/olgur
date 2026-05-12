<?php

declare(strict_types=1);

use App\Models\GameDatum;
use App\Models\IndexEntry;
use App\Models\Membership;
use App\Models\Module;
use App\Models\Rule;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;

use function Pest\Laravel\artisan;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a temporary game directory containing an index.json and data files.
 *
 * @param  array<string, mixed>  $manifest
 * @param  array<string, array<int, array<string, mixed>>>  $dataFiles  keyed by relative path
 * @return string The directory path
 */
function makeGameDir(array $manifest, array $dataFiles = []): string
{
    $dir = sys_get_temp_dir().'/game_'.uniqid('', true);
    mkdir($dir, 0o755, true);

    file_put_contents($dir.'/index.json', json_encode($manifest));

    foreach ($dataFiles as $relPath => $data) {
        file_put_contents($dir.'/'.$relPath, json_encode($data));
    }

    return $dir;
}

function removeGameDir(string $dir): void
{
    if (! is_dir($dir)) {
        return;
    }

    foreach ((array) scandir($dir) as $entry) {
        if ($entry === '.') {
            continue;
        }

        if ($entry === '..') {
            continue;
        }

        $full = $dir.'/'.$entry;
        is_dir($full) ? removeGameDir($full) : unlink($full);
    }

    rmdir($dir);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

$simpleGameRules = [
    ['number' => 'A', 'title' => 'Section A', 'content' => null, 'children' => [
        ['number' => 'A.1', 'title' => 'Rule A.1', 'content' => 'Content A.1', 'children' => []],
    ]],
    ['number' => 'B', 'title' => 'Section B', 'content' => 'Content B', 'children' => []],
];

$simpleGameIndex = [
    ['term' => 'Alpha', 'definition' => 'The first', 'notes' => null, 'links' => ['A.1'], 'references' => [], 'children' => []],
    ['term' => 'Beta', 'definition' => 'The second', 'notes' => null, 'links' => [], 'references' => [], 'children' => []],
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('happy path: creates system, modules, rules and index from index.json', function () use ($simpleGameRules, $simpleGameIndex): void {
    $dir = makeGameDir(
        [
            'name' => 'Advanced Squad Leader',
            'slug' => 'asl',
            'modules' => [
                ['type' => 'core', 'name' => 'Core Rules', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => $simpleGameIndex,
        ]
    );

    artisan('import:game', ['path' => $dir])
        ->assertSuccessful()
        ->expectsOutputToContain('Import complete.');

    expect(System::query()->where('slug', 'asl')->exists())->toBeTrue();
    expect(Module::query()->where('slug', 'core')->exists())->toBeTrue();
    expect(Rule::query()->count())->toBe(3);
    expect(IndexEntry::query()->count())->toBe(2);

    removeGameDir($dir);
});

test('system slug falls back to directory basename when absent from index.json', function () use ($simpleGameRules): void {
    $dir = makeGameDir(
        [
            'name' => 'Battalion Combat Series',
            'modules' => [
                ['type' => 'core', 'name' => 'Series Rules', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => [],
        ]
    );

    artisan('import:game', ['path' => $dir])->assertSuccessful();

    $slug = basename($dir);
    expect(System::query()->where('slug', $slug)->exists())->toBeTrue();

    removeGameDir($dir);
});

test('module slug falls back to type when slug absent from module definition', function () use ($simpleGameRules): void {
    $dir = makeGameDir(
        [
            'name' => 'Some Game',
            'slug' => 'some-game',
            'modules' => [
                ['type' => 'core', 'name' => 'Core Rules', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => [],
        ]
    );

    artisan('import:game', ['path' => $dir])->assertSuccessful();

    expect(Module::query()->where('slug', 'core')->exists())->toBeTrue();

    removeGameDir($dir);
});

test('--fresh flag wipes existing rules and index entries before reimporting', function () use ($simpleGameRules, $simpleGameIndex): void {
    $dir = makeGameDir(
        [
            'name' => 'Test Game',
            'slug' => 'test-game',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => $simpleGameIndex,
        ]
    );

    artisan('import:game', ['path' => $dir])->assertSuccessful();

    expect(Rule::query()->count())->toBe(3);
    expect(IndexEntry::query()->count())->toBe(2);

    // Second import with --fresh: counts stay the same (not doubled)
    artisan('import:game', ['path' => $dir, '--fresh' => true])->assertSuccessful();

    expect(Rule::query()->count())->toBe(3);
    expect(IndexEntry::query()->count())->toBe(2);

    removeGameDir($dir);
});

test('missing rules file warns and skips that module without aborting', function () use ($simpleGameRules, $simpleGameIndex): void {
    $dir = makeGameDir(
        [
            'name' => 'Partial Game',
            'slug' => 'partial-game',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
                ['type' => 'module', 'name' => 'Expansion', 'slug' => 'exp', 'path' => 'missing.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => $simpleGameIndex,
        ]
    );

    artisan('import:game', ['path' => $dir])
        ->assertSuccessful()
        ->expectsOutputToContain('skipping');

    // Core module rules should have been imported; expansion skipped
    expect(Rule::query()->count())->toBe(3);
    expect(Module::query()->where('slug', 'exp')->exists())->toBeFalse();

    removeGameDir($dir);
});

test('missing index file warns but still imports modules', function () use ($simpleGameRules): void {
    $dir = makeGameDir(
        [
            'name' => 'No Index Game',
            'slug' => 'no-index-game',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'missing_idx.json',
        ],
        [
            'rules.json' => $simpleGameRules,
        ]
    );

    artisan('import:game', ['path' => $dir])
        ->assertSuccessful()
        ->expectsOutputToContain('skipping');

    expect(Rule::query()->count())->toBe(3);
    expect(IndexEntry::query()->count())->toBe(0);

    removeGameDir($dir);
});

test('non-existent directory exits with failure', function (): void {
    artisan('import:game', ['path' => '/tmp/does-not-exist-olgur-test'])
        ->assertFailed()
        ->expectsOutputToContain('Directory not found');
});

test('system config is not overwritten on second import', function () use ($simpleGameRules): void {
    $dir = makeGameDir(
        [
            'name' => 'Config Test',
            'slug' => 'config-test',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => [],
        ]
    );

    artisan('import:game', ['path' => $dir])->assertSuccessful();
    artisan('import:game', ['path' => $dir, '--fresh' => true])->assertSuccessful();

    $system = System::query()->where('slug', 'config-test')->first();
    expect($system->config?->structure->value)->toBe('core_plus_many');

    removeGameDir($dir);
});

test('is_core is set correctly for core and expansion modules', function () use ($simpleGameRules): void {
    $expansionRules = [['number' => 'X1', 'title' => 'X Section', 'content' => null, 'children' => []]];

    $dir = makeGameDir(
        [
            'name' => 'Multi Module',
            'slug' => 'multi-module',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'core.json'],
                ['type' => 'module', 'name' => 'Expansion', 'slug' => 'exp', 'path' => 'exp.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'core.json' => $simpleGameRules,
            'exp.json' => $expansionRules,
            'idx.json' => [],
        ]
    );

    artisan('import:game', ['path' => $dir])->assertSuccessful();

    $core = Module::query()->where('slug', 'core')->first();
    $exp = Module::query()->where('slug', 'exp')->first();

    expect($core->is_core)->toBeTrue();
    expect($exp->is_core)->toBeFalse();

    removeGameDir($dir);
});

test('relative path is resolved relative to Laravel base path', function () use ($simpleGameRules): void {
    $basePath = base_path();
    $relDir = 'tmp_game_test_'.uniqid('', true);
    $absDir = $basePath.'/'.$relDir;
    mkdir($absDir, 0o755, true);

    file_put_contents($absDir.'/index.json', json_encode([
        'name' => 'Relative Game',
        'slug' => 'relative-game',
        'modules' => [
            ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
        ],
        'index' => 'idx.json',
    ]));
    file_put_contents($absDir.'/rules.json', json_encode($simpleGameRules));
    file_put_contents($absDir.'/idx.json', json_encode([]));

    artisan('import:game', ['path' => $relDir])->assertSuccessful();

    expect(System::query()->where('slug', 'relative-game')->exists())->toBeTrue();

    removeGameDir($absDir);
});

test('directory exists but has no index.json exits with failure', function (): void {
    $dir = sys_get_temp_dir().'/game_noindex_'.uniqid('', true);
    mkdir($dir, 0o755, true);

    artisan('import:game', ['path' => $dir])
        ->assertFailed()
        ->expectsOutputToContain('index.json not found');

    rmdir($dir);
});

test('manifest with no name field uses slug as system name', function () use ($simpleGameRules): void {
    $dir = makeGameDir(
        [
            'slug' => 'nameless-game',
            'modules' => [
                ['type' => 'core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => [],
        ]
    );

    artisan('import:game', ['path' => $dir])->assertSuccessful();

    $system = System::query()->where('slug', 'nameless-game')->first();
    expect($system->name)->toBe('nameless-game');

    removeGameDir($dir);
});

test('module with no name field uses slug as module name', function () use ($simpleGameRules): void {
    $dir = makeGameDir(
        [
            'name' => 'Named Game',
            'slug' => 'named-game',
            'modules' => [
                ['type' => 'core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => [],
        ]
    );

    artisan('import:game', ['path' => $dir])->assertSuccessful();

    $module = Module::query()->where('slug', 'core')->first();
    expect($module->name)->toBe('core');

    removeGameDir($dir);
});

test('manifest with no index key skips index import with warning', function () use ($simpleGameRules): void {
    $dir = makeGameDir(
        [
            'name' => 'No Index Key Game',
            'slug' => 'no-index-key',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            // no 'index' key
        ],
        [
            'rules.json' => $simpleGameRules,
        ]
    );

    artisan('import:game', ['path' => $dir])
        ->assertSuccessful()
        ->expectsOutputToContain('skipping index import');

    expect(Rule::query()->count())->toBe(3);
    expect(IndexEntry::query()->count())->toBe(0);

    removeGameDir($dir);
});

test('index entries with references are stored as see_also in relations', function (): void {
    $indexWithRefs = [
        ['term' => 'APCR', 'definition' => 'A round', 'notes' => null, 'links' => ['C.8.1'], 'references' => ['AP', 'APDS'], 'children' => []],
    ];

    $dir = makeGameDir(
        [
            'name' => 'Refs Game',
            'slug' => 'refs-game',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'rules.json' => [['number' => '1', 'title' => 'R', 'content' => null, 'children' => []]],
            'idx.json' => $indexWithRefs,
        ]
    );

    artisan('import:game', ['path' => $dir])->assertSuccessful();

    $entry = IndexEntry::query()->where('term', 'APCR')->first();
    expect($entry->relations['see_also'])->toBe(['AP', 'APDS']);
    expect($entry->relations['rule_refs'])->toBe(['C.8.1']);

    removeGameDir($dir);
});

test('index entries with nested children import correctly with parent_id', function (): void {
    $nestedIndex = [
        [
            'term' => 'Parent Term',
            'definition' => null,
            'notes' => null,
            'links' => [],
            'references' => [],
            'children' => [
                ['term' => 'Child Term', 'definition' => 'Child def', 'notes' => null, 'links' => [], 'references' => [], 'children' => []],
            ],
        ],
    ];

    $dir = makeGameDir(
        [
            'name' => 'Nested Index Game',
            'slug' => 'nested-idx-game',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'rules.json' => [['number' => '1', 'title' => 'R', 'content' => null, 'children' => []]],
            'idx.json' => $nestedIndex,
        ]
    );

    artisan('import:game', ['path' => $dir])->assertSuccessful();

    expect(IndexEntry::query()->count())->toBe(2);
    $parent = IndexEntry::query()->where('term', 'Parent Term')->first();
    $child = IndexEntry::query()->where('term', 'Child Term')->first();
    expect($child->parent_id)->toBe($parent->id);

    removeGameDir($dir);
});

test('json files with escaped characters in strings are parsed correctly', function (): void {
    $dir = makeGameDir(
        [
            'name' => 'Escape Game',
            'slug' => 'escape-game',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'rules.json' => [['number' => '1', 'title' => 'Rule with \"quotes\"', 'content' => "Line 1\nLine 2", 'children' => []]],
            'idx.json' => [],
        ]
    );

    artisan('import:game', ['path' => $dir])->assertSuccessful();

    expect(Rule::query()->count())->toBe(1);

    removeGameDir($dir);
});

test('json files with line and block comments are parsed correctly', function (): void {
    $dir = sys_get_temp_dir().'/game_comments_'.uniqid('', true);
    mkdir($dir, 0o755, true);

    file_put_contents($dir.'/index.json', '{
        /* game manifest */
        "name": "Comment Game",
        "slug": "comment-game",
        "modules": [
            // core module
            {"type": "core", "name": "Core", "slug": "core", "path": "rules.json"}
        ],
        "index": "idx.json"
    }');

    file_put_contents($dir.'/rules.json', '[
        // first rule
        {"number": "1", "title": "Rule One", "content": null, "children": []}
    ]');

    file_put_contents($dir.'/idx.json', '[
        /* entry */ {"term": "Alpha", "definition": "First", "children": []}
    ]');

    artisan('import:game', ['path' => $dir])->assertSuccessful();

    expect(Rule::query()->count())->toBe(1);
    expect(IndexEntry::query()->where('term', 'Alpha')->exists())->toBeTrue();

    removeGameDir($dir);
});

test('no core module in manifest skips index import with warning', function () use ($simpleGameRules): void {
    $dir = makeGameDir(
        [
            'name' => 'No Core Game',
            'slug' => 'no-core-game',
            'modules' => [
                ['type' => 'module', 'name' => 'Expansion Only', 'slug' => 'exp', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => [
                ['term' => 'Alpha', 'definition' => 'First', 'notes' => null, 'links' => [], 'references' => [], 'children' => []],
            ],
        ]
    );

    artisan('import:game', ['path' => $dir])
        ->assertSuccessful()
        ->expectsOutputToContain('No core module found');

    expect(IndexEntry::query()->count())->toBe(0);

    removeGameDir($dir);
});

test('structure key in manifest is used for system config', function () use ($simpleGameRules): void {
    $dir = makeGameDir(
        [
            'name' => 'Structure Override Game',
            'slug' => 'structure-override',
            'structure' => 'grouping_only',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => [],
        ]
    );

    artisan('import:game', ['path' => $dir])->assertSuccessful();

    $system = System::query()->where('slug', 'structure-override')->first();
    expect($system->config?->structure->value)->toBe('grouping_only');

    removeGameDir($dir);
});

test('--user option makes the user an admin of the imported system', function () use ($simpleGameRules): void {
    $user = User::factory()->create(['email' => 'admin@example.com']);

    $dir = makeGameDir(
        [
            'name' => 'User Admin Game',
            'slug' => 'user-admin-game',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => [],
        ]
    );

    artisan('import:game', ['path' => $dir, '--user' => 'admin@example.com'])
        ->assertSuccessful()
        ->expectsOutputToContain('admin of system');

    $system = System::query()->where('slug', 'user-admin-game')->firstOrFail();
    $membership = Membership::query()
        ->where('user_id', $user->id)
        ->where('system_id', $system->id)
        ->first();

    expect($membership)->not->toBeNull();
    expect($membership->admin)->toBeTrue();

    removeGameDir($dir);
});

test('--user option promotes existing membership to admin', function () use ($simpleGameRules): void {
    $user = User::factory()->create(['email' => 'existing@example.com']);

    $dir = makeGameDir(
        [
            'name' => 'Promote Admin Game',
            'slug' => 'promote-admin-game',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => [],
        ]
    );

    artisan('import:game', ['path' => $dir])->assertSuccessful();

    $system = System::query()->where('slug', 'promote-admin-game')->firstOrFail();

    Membership::factory()->create(['user_id' => $user->id, 'system_id' => $system->id, 'admin' => false]);

    artisan('import:game', ['path' => $dir, '--user' => 'existing@example.com', '--fresh' => true])->assertSuccessful();

    $membership = Membership::query()
        ->where('user_id', $user->id)
        ->where('system_id', $system->id)
        ->first();

    expect($membership->admin)->toBeTrue();

    removeGameDir($dir);
});

test('--user option warns when user email is not found', function () use ($simpleGameRules): void {
    $dir = makeGameDir(
        [
            'name' => 'Unknown User Game',
            'slug' => 'unknown-user-game',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => [],
        ]
    );

    artisan('import:game', ['path' => $dir, '--user' => 'nobody@example.com'])
        ->assertSuccessful()
        ->expectsOutputToContain('No user found with email');

    removeGameDir($dir);
});

test('--user option subscribes user to all modules with editor access', function () use ($simpleGameRules): void {
    $expansionRules = [['number' => 'X1', 'title' => 'X Section', 'content' => null, 'children' => []]];
    $user = User::factory()->create(['email' => 'subscriber@example.com']);

    $dir = makeGameDir(
        [
            'name' => 'Subscribe Game',
            'slug' => 'subscribe-game',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'core.json'],
                ['type' => 'module', 'name' => 'Expansion', 'slug' => 'exp', 'path' => 'exp.json'],
            ],
            'index' => 'idx.json',
        ],
        [
            'core.json' => $simpleGameRules,
            'exp.json' => $expansionRules,
            'idx.json' => [],
        ]
    );

    artisan('import:game', ['path' => $dir, '--user' => 'subscriber@example.com'])->assertSuccessful();

    $system = System::query()->where('slug', 'subscribe-game')->firstOrFail();

    $system->modules()->each(function (Module $module) use ($user): void {
        $subscription = Subscription::query()
            ->where('user_id', $user->id)
            ->where('module_id', $module->id)
            ->first();

        expect($subscription)->not->toBeNull();
        expect($subscription->editor)->toBeTrue();
    });

    removeGameDir($dir);
});

// ---------------------------------------------------------------------------
// Vehicle and ordnance importing
// ---------------------------------------------------------------------------

test('vehicles are imported when manifest has a vehicles key', function () use ($simpleGameRules): void {
    $vehicles = [
        ['id' => '2001', 'name' => 'PzKpfw IB', 'nation' => 'german', 'type' => 'Tt'],
        ['id' => '2002', 'name' => 'PzKpfw IIA', 'nation' => 'german', 'type' => 'Tt'],
    ];

    $dir = makeGameDir(
        [
            'name' => 'Vehicle Game',
            'slug' => 'vehicle-game',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
            'vehicles' => 'vehicles.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => [],
            'vehicles.json' => $vehicles,
        ]
    );

    artisan('import:game', ['path' => $dir])
        ->assertSuccessful()
        ->expectsOutputToContain('Imported 2 vehicles');

    expect(GameDatum::query()->where('type', 'vehicle')->count())->toBe(2);
    expect(GameDatum::query()->where('slug', 'vehicle-2001')->exists())->toBeTrue();
    expect(GameDatum::query()->where('slug', 'vehicle-2002')->exists())->toBeTrue();

    $datum = GameDatum::query()->where('slug', 'vehicle-2001')->first();
    expect($datum->name)->toBe('PzKpfw IB');

    removeGameDir($dir);
});

test('ordnance is imported when manifest has an ordnance key', function () use ($simpleGameRules): void {
    $ordnance = [
        ['id' => '1001', 'name' => '5cm leGrW 36', 'nation' => 'german', 'type' => 'MTR'],
    ];

    $dir = makeGameDir(
        [
            'name' => 'Ordnance Game',
            'slug' => 'ordnance-game',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
            'ordnance' => 'ordnance.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => [],
            'ordnance.json' => $ordnance,
        ]
    );

    artisan('import:game', ['path' => $dir])
        ->assertSuccessful()
        ->expectsOutputToContain('Imported 1 ordnance');

    expect(GameDatum::query()->where('type', 'ordnance')->count())->toBe(1);
    expect(GameDatum::query()->where('slug', 'ordnance-1001')->exists())->toBeTrue();

    $datum = GameDatum::query()->where('slug', 'ordnance-1001')->first();
    expect($datum->name)->toBe('5cm leGrW 36');

    removeGameDir($dir);
});

test('--fresh flag deletes and reimports vehicles and ordnance', function () use ($simpleGameRules): void {
    $vehicles = [
        ['id' => '2001', 'name' => 'PzKpfw IB', 'nation' => 'german', 'type' => 'Tt'],
    ];

    $dir = makeGameDir(
        [
            'name' => 'Fresh Game Data',
            'slug' => 'fresh-game-data',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
            'vehicles' => 'vehicles.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => [],
            'vehicles.json' => $vehicles,
        ]
    );

    artisan('import:game', ['path' => $dir])->assertSuccessful();
    expect(GameDatum::query()->where('type', 'vehicle')->count())->toBe(1);

    // Second import with --fresh: count stays 1 (deleted then reimported)
    artisan('import:game', ['path' => $dir, '--fresh' => true])->assertSuccessful();
    expect(GameDatum::query()->where('type', 'vehicle')->count())->toBe(1);

    removeGameDir($dir);
});

test('missing vehicles file warns and continues without aborting', function () use ($simpleGameRules): void {
    $dir = makeGameDir(
        [
            'name' => 'Missing Vehicles Game',
            'slug' => 'missing-vehicles-game',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
            'vehicles' => 'nonexistent_vehicles.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => [],
        ]
    );

    artisan('import:game', ['path' => $dir])
        ->assertSuccessful()
        ->expectsOutputToContain('skipping');

    expect(GameDatum::query()->where('type', 'vehicle')->count())->toBe(0);
    expect(Rule::query()->count())->toBe(3);

    removeGameDir($dir);
});

test('missing ordnance file warns and continues without aborting', function () use ($simpleGameRules): void {
    $dir = makeGameDir(
        [
            'name' => 'Missing Ordnance Game',
            'slug' => 'missing-ordnance-game',
            'modules' => [
                ['type' => 'core', 'name' => 'Core', 'slug' => 'core', 'path' => 'rules.json'],
            ],
            'index' => 'idx.json',
            'ordnance' => 'nonexistent_ordnance.json',
        ],
        [
            'rules.json' => $simpleGameRules,
            'idx.json' => [],
        ]
    );

    artisan('import:game', ['path' => $dir])
        ->assertSuccessful()
        ->expectsOutputToContain('skipping');

    expect(GameDatum::query()->where('type', 'ordnance')->count())->toBe(0);

    removeGameDir($dir);
});
