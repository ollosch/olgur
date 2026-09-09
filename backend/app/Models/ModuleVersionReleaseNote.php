<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ModuleVersionReleaseNoteFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $module_version_id
 * @property string $entity_type
 * @property string $entity_id
 * @property string $note
 */
#[Fillable(['module_version_id', 'entity_type', 'entity_id', 'note'])]
final class ModuleVersionReleaseNote extends Model
{
    /** @use HasFactory<ModuleVersionReleaseNoteFactory> */
    use HasFactory;

    use HasUlids;

    /**
     * @return BelongsTo<ModuleVersion, $this>
     */
    public function moduleVersion(): BelongsTo
    {
        return $this->belongsTo(ModuleVersion::class);
    }
}
