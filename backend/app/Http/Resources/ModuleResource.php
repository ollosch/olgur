<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Http\Resources\RuleResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ModuleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'rules' => RuleResource::collection($this->whenLoaded('rules')),
        ];
    }
}
