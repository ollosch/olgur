<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\System;
use App\Models\User;
use App\Services\PermissionMap;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin System */
final class SystemResource extends JsonResource
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
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->description,
            'config' => $this->config?->toArray(),
            'permissions' => $this->permissions($request),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    /**
     * @return array<string, bool>
     */
    private function permissions(Request $request): array
    {
        /** @var User $user */
        $user = $request->user();

        /** @var System $system */
        $system = $this->resource;

        return resolve(PermissionMap::class)->system($user, $system);
    }
}
