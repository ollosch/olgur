<?php

declare(strict_types=1);

namespace App\Services;

use App\Http\Resources\ModuleResource;
use App\Models\Module;
use App\Models\Version;
use Illuminate\Support\Facades\Storage;

final class VersionService
{
    public function createSnapshot(Module $module, string $name): void
    {
        $resource = new ModuleResource($module->load('rules'));
        $json = $resource->toPrettyJson();

        $filePath = $this->generateFilePath($module);

        Storage::disk('snapshots')->put($filePath, $json);

        Version::create([
            'module_id' => $module->id,
            'name' => $name,
            'filepath' => $filePath,
        ]);
    }

    public function generateFilePath(Module $module): string
    {
        return "/{$module->system->id}/{$module->id}.json";
    }

}
