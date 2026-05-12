<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\GameDatum;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin GameDatum */
final class GameDatumResource extends JsonResource
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
            'type' => $this->type->value,
            'slug' => $this->slug,
            'name' => $this->name,
            'content' => $this->content,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
