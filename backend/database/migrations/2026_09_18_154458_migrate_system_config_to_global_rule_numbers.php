<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('systems')->orderBy('id')->chunkById(100, function ($systems): void {
            foreach ($systems as $system) {
                /** @var array<string, mixed> $config */
                $config = is_string($system->config) ? (json_decode($system->config, true) ?? []) : [];

                // Idempotent: skip systems that have already been migrated.
                if (array_key_exists('global_rule_numbers', $config)) {
                    continue;
                }

                $newConfig = [
                    'global_rule_numbers' => ($config['system_structure'] ?? null) === 'core_plus_many',
                    'sort_rules_by' => is_string($config['sort_rules_by'] ?? null) ? $config['sort_rules_by'] : 'sort_order',
                    'toc_depth' => is_int($config['toc_depth'] ?? null) ? $config['toc_depth'] : 1,
                    'cover_image' => is_string($config['cover_image'] ?? null) ? $config['cover_image'] : null,
                ];

                DB::table('systems')->where('id', $system->id)->update([
                    'config' => json_encode($newConfig),
                ]);
            }
        });
    }
};
