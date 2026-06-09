<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ModuleVersionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $module_id
 * @property string|null $released_by
 * @property string $version_string
 * @property string $notes
 * @property int $revision
 * @property Carbon|null $released_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['module_id', 'version_string', 'notes', 'revision', 'released_at', 'released_by'])]
final class ModuleVersion extends Model
{
    /** @use HasFactory<ModuleVersionFactory> */
    use HasFactory;

    use HasUlids;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'released_at' => 'datetime',
            'revision' => 'integer',
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
     * @return HasMany<GameDatumVersion, $this>
     */
    public function gameDatumVersions(): HasMany
    {
        return $this->hasMany(GameDatumVersion::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function releasedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'released_by');
    }

    /**
     * @return HasMany<RuleVersion, $this>
     */
    public function ruleVersions(): HasMany
    {
        return $this->hasMany(RuleVersion::class);
    }

    /**
     * @return HasMany<IndexEntryVersion, $this>
     */
    public function indexEntryVersions(): HasMany
    {
        return $this->hasMany(IndexEntryVersion::class);
    }

    /**
     * @return HasMany<ModuleVersionAmendment, $this>
     */
    public function amendments(): HasMany
    {
        return $this->hasMany(ModuleVersionAmendment::class);
    }
}
