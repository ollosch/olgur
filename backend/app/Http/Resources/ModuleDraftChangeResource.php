<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ModuleDraftChange;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ModuleDraftChange */
final class ModuleDraftChangeResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var ModuleDraftChange $change */
        $change = $this->resource;

        return [
            'id' => $change->id,
            'module_id' => $change->module_id,
            'module_version_id' => $change->module_version_id,
            'entity_type' => $change->entity_type,
            'entity_id' => $change->entity_id,
            'change_type' => $change->change_type,
            'classification' => $change->classification->value,
            'content_before' => $change->content_before,
            'content_after' => $change->content_after,
            'changed_by' => $change->changed_by,
            'changed_at' => $change->changed_at->toIso8601String(),
        ];
    }
}
