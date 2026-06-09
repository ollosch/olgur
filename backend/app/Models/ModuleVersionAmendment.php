<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ModuleVersionAmendmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $module_version_id
 * @property string $entity_type
 * @property string $entity_id
 * @property string $change_type
 * @property string $description
 * @property array<mixed> $content_after
 * @property string $amended_by
 * @property Carbon $amended_at
 */
#[Fillable(['module_version_id', 'entity_type', 'entity_id', 'change_type', 'description', 'content_after', 'amended_by', 'amended_at'])]
final class ModuleVersionAmendment extends Model
{
    /** @use HasFactory<ModuleVersionAmendmentFactory> */
    use HasFactory;

    use HasUlids;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'content_after' => 'array',
            'amended_at' => 'datetime',
        ];
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
    public function amendedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'amended_by');
    }
}
