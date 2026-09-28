<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\Module;
use App\Models\ModuleVersion;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Releases a module's current content as a new version without going through
 * the draft review workflow. Used by the importer to produce an immediately
 * readable, offline-cacheable snapshot.
 */
final readonly class ReleaseModuleVersion
{
    public function __construct(private SnapshotModuleVersion $snapshot) {}

    public function execute(Module $module, User $releasedBy, string $version, string $notes): ModuleVersion
    {
        return DB::transaction(function () use ($module, $releasedBy, $version, $notes): ModuleVersion {
            $moduleVersion = ModuleVersion::query()->create([
                'module_id' => $module->id,
                'version_string' => $version,
                'notes' => $notes,
                'released_at' => now(),
                'released_by' => $releasedBy->id,
            ]);

            $this->snapshot->snapshot($module, $moduleVersion);

            return $moduleVersion;
        });
    }
}
