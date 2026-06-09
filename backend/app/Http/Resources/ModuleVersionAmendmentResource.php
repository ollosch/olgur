<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ModuleVersionAmendment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ModuleVersionAmendment */
final class ModuleVersionAmendmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var ModuleVersionAmendment $amendment */
        $amendment = $this->resource;

        return [
            'id' => $amendment->id,
            'module_version_id' => $amendment->module_version_id,
            'entity_type' => $amendment->entity_type,
            'entity_id' => $amendment->entity_id,
            'change_type' => $amendment->change_type,
            'description' => $amendment->description,
            'content_after' => $amendment->content_after,
            'amended_by' => $amendment->amended_by,
            'amended_at' => $amendment->amended_at->toIso8601String(),
        ];
    }
}
