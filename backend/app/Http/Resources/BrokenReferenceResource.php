<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Data\BrokenReference;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin BrokenReference */
final class BrokenReferenceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'module' => $this->module,
            'location' => $this->location,
            'kind' => $this->kind->value,
            'reference' => $this->reference,
            'reason' => $this->reason->value,
        ];
    }
}
