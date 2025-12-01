<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Module;
use App\Models\Rule;
use App\Models\System;
use App\Models\SystemIndex;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Contracts\Console\PromptsForMissingInput;

final class ImportGameSystemData extends Command implements PromptsForMissingInput
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'olwu:import
                            {name : The name of the system}
                            {folder : The folder containing the system data}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import all game system data for a specific system';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $systemName = $this->argument('name');
        $systemFolder = $this->argument('folder');

        if (! is_dir($systemFolder)) {
            $this->info("The specified folder {$systemFolder} does not exist.");

            return self::FAILURE;
        }

        if (System::where('name', $systemName)->exists()) {
            $this->info('System with this name already exists.');

            if ($this->confirm('Do you wish to delete it first?')) {
                System::where('name', $systemName)->delete();
                $this->info('Existing system deleted.');
            } else {
                $this->info('Import cancelled.');

                return self::FAILURE;
            }
        }

        $this->info("Importing {$systemFolder} as \"{$systemName}\"");

        $systemFolder = mb_rtrim($systemFolder, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR;
        $systemConfig = file_get_contents($systemFolder.'index.json');

        if ($systemConfig === false) {
            $this->error('Failed to read index.json file.');

            return self::FAILURE;
        }

        $systemConfig = json_decode($systemConfig, true);

        $name = $systemConfig['name'];
        $shortName = $systemConfig['short_name'] ?? $systemName;
        $systemFiles = $systemConfig['files'] ?? [];

        // Create system record
        $system = System::create([
            'owner_id' => User::first()->id,
            'name' => $shortName,
            'description' => $name,
        ]);

        foreach ($systemFiles as $systemFile) {
            $this->info("Importing {$systemFile['type']} file: {$systemFile['path']}");
            $this->importSystemFile($system, $systemFile, $systemFolder);
        }

        $this->info('Import completed successfully!');

        return self::SUCCESS;
    }

    private function importSystemFile(System $system, array $systemFile, string $systemFolder): void
    {
        $filePath = mb_rtrim($systemFolder, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$systemFile['path'];

        if (! file_exists($filePath)) {
            $this->error("File not found: {$filePath}");

            return;
        }

        $content = file_get_contents($filePath);

        if ($content === false) {
            $this->error("Failed to read file: {$filePath}");

            return;
        }

        $json = json_decode($content, true, 512, JSON_THROW_ON_ERROR);

        switch ($systemFile['type']) {
            case 'rules':
                $count = $this->importRules($system->modules()->where('type', 'core')->first(), $json);
                $this->info("Imported {$count} rules.");
                break;

            case 'index':
                $count = $this->importIndex($system, $json);
                $this->info("Imported {$count} index entries.");
                break;

            default:
                $this->error("Unknown file type: {$systemFile['type']}");
                break;
        }
    }

    private function makeMpath(string $number, string $char, int $padWidth): string
    {
        $parts = explode('.', $number);
        $mpathParts = array_map(fn (string $part): string => mb_str_pad($part, $padWidth, $char, STR_PAD_LEFT), array_slice($parts, 1));

        return $parts[0].'.'.implode('.', $mpathParts);
    }

    private function importRules(Module $module, array $data): int
    {
        $counter = 0;

        foreach ($data as $ruleData) {
            Rule::create([
                'module_id' => $module->id,
                'mpath' => $this->makeMpath($ruleData['number'], '0', 3),
                'title' => $ruleData['title'] ?? '',
                'content' => $ruleData['content'] ?? '',
            ]);

            $counter++;

            if (isset($ruleData['children']) && is_array($ruleData['children']) && count($ruleData['children']) > 0) {
                $counter += $this->importRules($module, $ruleData['children']);
            }
        }

        return $counter;
    }

    private function importIndex(System $system, array $data): int
    {
        $counter = 0;

        foreach ($data as $indexData) {
            SystemIndex::create([
                'system_id' => $system->id,
                'term' => $indexData['term'],
                'definition' => $indexData['definition'] ?? '',
                'references' => implode(';', $indexData['references'] ?? []),
                'links' => implode(';', $indexData['links'] ?? []),
            ]);

            $counter++;

            if (isset($indexData['children']) && is_array($indexData['children']) && count($indexData['children']) > 0) {
                $counter += $this->importIndex($system, $indexData['children']);
            }
        }

        return $counter;
    }
}
