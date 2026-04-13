<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ModuleVersion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ModuleVersion */
final class ModuleVersionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var ModuleVersion $version */
        $version = $this->resource;

        return [
            'id' => $version->id,
            'module_id' => $version->module_id,
            'version_string' => $version->version_string,
            'notes' => $version->notes,
            'released_by' => $version->released_by,
            'released_at' => $version->released_at?->toIso8601String(),
            'created_at' => $version->created_at,
            'updated_at' => $version->updated_at,
        ];
    }
}
