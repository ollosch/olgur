<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Module;
use App\Models\User;
use App\Services\PermissionMap;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Module */
final class ModuleResource extends JsonResource
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
            'system_id' => $this->system_id,
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->description,
            'config' => $this->config->toArray(),
            'is_core' => $this->is_core,
            'sort_order' => $this->sort_order,
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

        /** @var Module $module */
        $module = $this->resource;

        return resolve(PermissionMap::class)->module($user, $module->system()->firstOrFail(), $module);
    }
}
