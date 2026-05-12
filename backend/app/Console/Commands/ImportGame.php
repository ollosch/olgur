<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Data\SystemConfig;
use App\Enums\GameDataType;
use App\Models\GameDatum;
use App\Models\IndexEntry;
use App\Models\Membership;
use App\Models\Module;
use App\Models\Rule;
use App\Models\Subscription;
use App\Models\System;
use App\Models\User;
use App\Services\ImportCounter;
use App\Services\ModuleDataImporter;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class ImportGame extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'import:game
        {path : Path to a game data directory (must contain index.json)}
        {--user=ollo@olgur.de : Email address of a user to make admin of the imported system}
        {--fresh : Delete existing rules and index entries before importing}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import a full game system from a directory containing an index.json manifest';

    public function __construct(private readonly ModuleDataImporter $importer)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $rawPath = (string) $this->argument('path');

        // Resolve absolute or relative-to-base-path
        $gameDir = str_starts_with($rawPath, '/')
            ? $rawPath
            : base_path($rawPath);

        if (! is_dir($gameDir)) {
            $this->error('Directory not found: '.$gameDir);

            return self::FAILURE;
        }

        $indexJsonPath = $gameDir.'/index.json';

        if (! file_exists($indexJsonPath)) {
            $this->error('index.json not found in: '.$gameDir);

            return self::FAILURE;
        }

        /** @var array<string, mixed> $manifest */
        $manifest = $this->readJson($indexJsonPath) ?? [];

        $structureValue = is_string($manifest['structure'] ?? null) && $manifest['structure'] !== ''
            ? $manifest['structure']
            : 'core_plus_many';

        $fresh = (bool) $this->option('fresh');

        // Determine system slug: index.json slug → fallback to directory basename
        $systemSlug = is_string($manifest['slug'] ?? null) && $manifest['slug'] !== ''
            ? $manifest['slug']
            : basename($gameDir);

        $systemName = is_string($manifest['name'] ?? null) && $manifest['name'] !== ''
            ? $manifest['name']
            : $systemSlug;

        /** @var array<int, array<string, mixed>> $modules */
        $modules = is_array($manifest['modules'] ?? null) ? $manifest['modules'] : [];

        DB::transaction(function () use (
            $systemSlug,
            $systemName,
            $structureValue,
            $modules,
            $manifest,
            $gameDir,
            $fresh,
        ): void {
            $system = System::query()->firstOrCreate(
                ['slug' => $systemSlug],
                [
                    'name' => $systemName,
                    'config' => SystemConfig::fromArray(['system_structure' => $structureValue]),
                ]
            );

            $this->line(sprintf('System: %s (%s)', $system->name, $system->slug));

            $coreModule = null;

            foreach ($modules as $sortOrder => $moduleDef) {
                // Determine module slug: module.slug → fallback to module.type
                $moduleSlug = is_string($moduleDef['slug'] ?? null) && $moduleDef['slug'] !== ''
                    ? $moduleDef['slug']
                    : (is_string($moduleDef['type'] ?? null) ? $moduleDef['type'] : 'module');

                $moduleName = is_string($moduleDef['name'] ?? null) && $moduleDef['name'] !== ''
                    ? $moduleDef['name']
                    : $moduleSlug;

                $isCore = (is_string($moduleDef['type'] ?? null) && $moduleDef['type'] === 'core');

                $rulesRelPath = is_string($moduleDef['path'] ?? null) ? $moduleDef['path'] : '';
                $rulesPath = $gameDir.'/'.$rulesRelPath;

                if ($rulesRelPath === '' || ! file_exists($rulesPath)) {
                    $this->warn(sprintf('Rules file not found for module "%s", skipping.', $moduleSlug));

                    continue;
                }

                /** @var array<int, array<string, mixed>> $rulesData */
                $rulesData = $this->readJson($rulesPath) ?? [];

                $module = Module::query()->firstOrCreate(
                    ['system_id' => $system->id, 'slug' => $moduleSlug],
                    [
                        'name' => $moduleName,
                        'is_core' => $isCore,
                        'sort_order' => $sortOrder,
                    ]
                );

                // Always update mutable fields
                $module->name = $moduleName;
                $module->is_core = $isCore;
                $module->sort_order = max(0, $sortOrder);
                $module->save();

                if ($fresh) {
                    $this->warn(sprintf('Deleting existing rules for module "%s"...', $moduleSlug));
                    Rule::query()->where('module_id', $module->id)->delete();
                }

                $this->info(sprintf('Importing rules for module "%s"...', $moduleSlug));
                $ruleCount = $this->importer->importRules($rulesData, $module->id, null, new ImportCounter());
                $this->info(sprintf('Imported %d rules.', $ruleCount));

                if ($isCore && $coreModule === null) {
                    $coreModule = $module;
                }
            }

            // Import system-level index into the core module
            $indexRelPath = is_string($manifest['index'] ?? null) ? $manifest['index'] : '';

            if ($indexRelPath === '') {
                $this->warn('No index path defined in index.json, skipping index import.');

                return;
            }

            $indexPath = $gameDir.'/'.$indexRelPath;

            if (! file_exists($indexPath)) {
                $this->warn(sprintf('Index file not found: %s, skipping.', $indexPath));

                return;
            }

            if ($coreModule === null) {
                $this->warn('No core module found, skipping index import.');

                return;
            }

            /** @var array<int, array<string, mixed>> $indexData */
            $indexData = $this->readJson($indexPath) ?? [];

            if ($fresh) {
                $this->warn('Deleting existing index entries for core module...');
                IndexEntry::query()->where('module_id', $coreModule->id)->delete();
            }

            $this->info('Importing system index...');
            $indexCount = $this->importer->importIndexEntries($indexData, $coreModule->id, null);
            $this->info(sprintf('Imported %d index entries.', $indexCount));

            // Import vehicles and ordnance if present in manifest
            $gameDataTypes = [
                'vehicles' => GameDataType::Vehicle,
                'ordnance' => GameDataType::Ordnance,
            ];

            foreach ($gameDataTypes as $manifestKey => $gameDataType) {
                $relPath = is_string($manifest[$manifestKey] ?? null) ? $manifest[$manifestKey] : '';

                if ($relPath === '') {
                    continue;
                }

                $filePath = $gameDir.'/'.$relPath;

                if (! file_exists($filePath)) {
                    $this->warn(sprintf('%s file not found: %s, skipping.', ucfirst($manifestKey), $filePath));

                    continue;
                }

                if ($fresh) {
                    $this->warn(sprintf('Deleting existing %s for core module...', $manifestKey));
                    GameDatum::query()
                        ->where('module_id', $coreModule->id)
                        ->where('type', $gameDataType->value)
                        ->delete();
                }

                /** @var array<int, array<string, mixed>> $gameDataItems */
                $gameDataItems = $this->readJson($filePath) ?? [];

                $this->info(sprintf('Importing %s...', $manifestKey));
                $count = $this->importer->importGameData($gameDataItems, $coreModule->id, $gameDataType);
                $this->info(sprintf('Imported %d %s.', $count, $manifestKey));
            }
        });

        $this->info('Import complete.');

        $userEmail = $this->option('user');

        if (is_string($userEmail) && $userEmail !== '') {
            $user = User::query()->where('email', $userEmail)->first();

            if ($user === null) {
                $this->warn(sprintf('No user found with email "%s", skipping admin assignment.', $userEmail));

                return self::SUCCESS;
            }

            $system = System::query()->where('slug', $systemSlug)->firstOrFail();

            /** @var Membership $membership */
            $membership = Membership::query()->firstOrCreate(
                ['user_id' => $user->id, 'system_id' => $system->id],
                ['admin' => true, 'config' => []],
            );

            if (! $membership->wasRecentlyCreated) {
                $membership->admin = true;
                $membership->save();
            }

            $this->info(sprintf('User "%s" is now admin of system "%s".', $userEmail, $systemSlug));

            // Subscribe the user to every module in the system (editor access)
            // so the frontend shows them as subscribed, matching the behaviour
            // of SystemController::store() which subscribes the creator to the
            // auto-created core module.
            $system->modules()->each(function (Module $module) use ($user): void {
                Subscription::query()->firstOrCreate(
                    ['user_id' => $user->id, 'module_id' => $module->id],
                    ['editor' => true],
                );
            });

            $this->info(sprintf('User "%s" subscribed to all modules of system "%s".', $userEmail, $systemSlug));
        }

        return self::SUCCESS;
    }

    /**
     * Read a JSON file, stripping line and block comments before decoding.
     * Uses a state machine so comment markers inside string values are left untouched.
     */
    private function readJson(string $path): mixed
    {
        $raw = (string) file_get_contents($path);

        // Split into individual bytes so the loop uses no integer indexing,
        // avoiding the mb_str_functions Pint rule while remaining correct for
        // multibyte UTF-8 content (JSON structural characters are all ASCII).
        /** @var list<string> $bytes */
        $bytes = mb_str_split($raw) ?: [];
        $count = count($bytes);
        $out = '';
        $i = 0;
        $inString = false;

        while ($i < $count) {
            $ch = $bytes[$i];

            if ($inString) {
                if ($ch === '\\' && $i + 1 < $count) {
                    $out .= $ch.$bytes[$i + 1];
                    $i += 2;

                    continue;
                }

                if ($ch === '"') {
                    $inString = false;
                }

                $out .= $ch;
                $i++;

                continue;
            }

            if ($ch === '"') {
                $inString = true;
                $out .= $ch;
                $i++;

                continue;
            }

            if ($ch === '/' && $i + 1 < $count && $bytes[$i + 1] === '/') {
                $i += 2;
                while ($i < $count && $bytes[$i] !== "\n" && $bytes[$i] !== "\r") {
                    $i++;
                }

                continue;
            }

            if ($ch === '/' && $i + 1 < $count && $bytes[$i + 1] === '*') {
                $i += 2;
                while ($i + 1 < $count && ! ($bytes[$i] === '*' && $bytes[$i + 1] === '/')) {
                    $i++;
                }

                $i += 2;

                continue;
            }

            $out .= $ch;
            $i++;
        }

        // Strip trailing commas left behind by commented-out lines, e.g. ["a",\n// "b"\n]
        $out = (string) preg_replace('/,(\s*[}\]])/', '$1', $out);

        return json_decode($out, true);
    }
}
