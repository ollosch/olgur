<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\IndexEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin IndexEntry */
final class IndexEntryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'module_id' => $this->module_id,
            'parent_id' => $this->parent_id,
            'term' => $this->term,
            'definition' => $this->definition,
            'notes' => $this->notes,
            'relations' => $this->relations,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
