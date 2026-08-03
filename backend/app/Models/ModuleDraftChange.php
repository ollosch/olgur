<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ModuleDraftChangeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $module_id
 * @property string|null $module_version_id
 * @property string $entity_type
 * @property string $entity_id
 * @property string $change_type
 * @property string|null $description
 * @property array<mixed> $content_after
 * @property string $changed_by
 * @property Carbon $changed_at
 */
#[Fillable(['module_id', 'module_version_id', 'entity_type', 'entity_id', 'change_type', 'description', 'content_after', 'changed_by', 'changed_at'])]
#[WithoutTimestamps]
final class ModuleDraftChange extends Model
{
    /** @use HasFactory<ModuleDraftChangeFactory> */
    use HasFactory;

    use HasUlids;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'content_after' => 'array',
            'changed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Module, $this>
     */
    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    /**
     * @return BelongsTo<ModuleVersion, $this>
     */
    public function moduleVersion(): BelongsTo
    {
        return $this->belongsTo(ModuleVersion::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
