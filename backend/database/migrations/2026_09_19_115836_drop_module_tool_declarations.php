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
        DB::table('modules')->orderBy('id')->chunkById(100, function ($modules): void {
            foreach ($modules as $module) {
                /** @var array<string, mixed> $config */
                $config = is_string($module->config) ? (json_decode($module->config, true) ?? []) : [];

                // Idempotent: skip modules that no longer declare tools.
                if (! array_key_exists('tools', $config)) {
                    continue;
                }

                unset($config['tools']);

                DB::table('modules')->where('id', $module->id)->update([
                    'config' => json_encode($config),
                ]);
            }
        });
    }
};
