<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\GameDataType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ModuleDataImporter
{
    /**
     * Import a recursive tree of rules into a module.
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    public function importRules(array $items, string $moduleId, ?string $parentId, ImportCounter $counter): int
    {
        $total = 0;
        $rows = [];

        foreach ($items as $item) {
            $id = Str::lower((string) Str::ulid());
            $now = now()->toDateTimeString();

            $rows[] = [
                'id' => $id,
                'module_id' => $moduleId,
                'parent_id' => $parentId,
                'number' => is_string($item['number'] ?? null) ? $item['number'] : '',
                'title' => is_string($item['title'] ?? null) ? $item['title'] : '',
                'content' => is_string($item['content'] ?? null) ? $item['content'] : '',
                'sort_order' => $counter->next(),
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $total++;

            /** @var array<int, array<string, mixed>> $children */
            $children = is_array($item['children'] ?? null) ? $item['children'] : [];

            if ($children !== []) {
                // Flush current batch before recursing so parent rows exist
                $this->insertChunked('rules', $rows);
                $rows = [];
                $total += $this->importRules($children, $moduleId, $id, new ImportCounter());
            }
        }

        if ($rows !== []) {
            $this->insertChunked('rules', $rows);
        }

        return $total;
    }

    /**
     * Import a recursive tree of index entries into a module.
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    public function importIndexEntries(array $items, string $moduleId, ?string $parentId): int
    {
        $total = 0;
        $rows = [];

        foreach ($items as $item) {
            $id = Str::lower((string) Str::ulid());
            $now = now()->toDateTimeString();

            /** @var string[] $links */
            $links = is_array($item['links'] ?? null) ? array_values(array_filter($item['links'], is_string(...))) : [];

            /** @var string[] $references */
            $references = is_array($item['references'] ?? null) ? array_values(array_filter($item['references'], is_string(...))) : [];

            $relations = [];

            if ($links !== []) {
                $relations['rule_refs'] = $links;
            }

            if ($references !== []) {
                $relations['see_also'] = $references;
            }

            $rows[] = [
                'id' => $id,
                'module_id' => $moduleId,
                'parent_id' => $parentId,
                'term' => is_string($item['term'] ?? null) ? $item['term'] : '',
                'definition' => is_string($item['definition'] ?? null) ? $item['definition'] : '',
                'notes' => is_string($item['notes'] ?? null) ? $item['notes'] : '',
                'relations' => $relations !== [] ? json_encode($relations) : '{}',
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $total++;

            /** @var array<int, array<string, mixed>> $children */
            $children = is_array($item['children'] ?? null) ? $item['children'] : [];

            if ($children !== []) {
                $this->insertChunked('index_entries', $rows);
                $rows = [];
                $total += $this->importIndexEntries($children, $moduleId, $id);
            }
        }

        if ($rows !== []) {
            $this->insertChunked('index_entries', $rows);
        }

        return $total;
    }

    /**
     * Import a flat list of game data items (vehicles, ordnance, etc.) into a module.
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    public function importGameData(array $items, string $moduleId, GameDataType $type): int
    {
        $total = 0;
        $rows = [];

        foreach ($items as $item) {
            $now = now()->toDateTimeString();
            $rawId = is_string($item['id'] ?? null) ? $item['id'] : (is_int($item['id'] ?? null) ? (string) $item['id'] : '');
            $slug = $type->value.'-'.$rawId;
            $name = is_string($item['name'] ?? null) ? $item['name'] : '';

            $rows[] = [
                'id' => Str::lower((string) Str::ulid()),
                'module_id' => $moduleId,
                'type' => $type->value,
                'slug' => $slug,
                'name' => $name,
                'content' => json_encode($item) ?: '{}',
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $total++;
        }

        if ($rows !== []) {
            $this->insertChunked('game_data', $rows);
        }

        return $total;
    }

    /**
     * Import a flat list of game data tables into a module.
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    public function importTables(array $items, string $moduleId): int
    {
        $total = 0;
        $rows = [];

        foreach ($items as $item) {
            $now = now()->toDateTimeString();
            $slug = is_string($item['slug'] ?? null) ? $item['slug'] : '';
            $name = is_string($item['name'] ?? null) ? $item['name'] : $slug;
            $content = is_array($item['content'] ?? null) ? $item['content'] : null;

            $rows[] = [
                'id' => Str::lower((string) Str::ulid()),
                'module_id' => $moduleId,
                'type' => GameDataType::Table->value,
                'slug' => $slug,
                'name' => $name,
                'content' => $content !== null ? (json_encode($content) ?: '{}') : '{}',
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $total++;
        }

        if ($rows !== []) {
            $this->insertChunked('game_data', $rows);
        }

        return $total;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    public function insertChunked(string $table, array $rows): void
    {
        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table($table)->insert($chunk);
        }
    }
}

/**
 * Simple incrementing counter to track sort_order within a sibling group.
 *
 * @internal
 */
final class ImportCounter
{
    private int $value = 0;

    public function next(): int
    {
        return $this->value++;
    }
}
