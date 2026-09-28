<?php

declare(strict_types=1);

namespace App\Models;

use App\Data\SystemConfig;
use Database\Factories\SystemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $slug
 * @property string $name
 * @property string|null $description
 * @property SystemConfig|null $config
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['slug', 'name', 'description', 'config'])]
final class System extends Model
{
    /** @use HasFactory<SystemFactory> */
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
            'config' => SystemConfig::class,
        ];
    }

    /**
     * @return HasMany<Module, $this>
     */
    public function modules(): HasMany
    {
        return $this->hasMany(Module::class)->orderBy('sort_order');
    }

    /**
     * @return HasMany<Membership, $this>
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    /**
     * The system's core module, if one exists.
     */
    public function coreModule(): ?Module
    {
        return $this->modules()
            ->where('is_core', true)
            ->first();
    }

    public function isMember(User $user): bool
    {
        return $this->memberships()->where('user_id', $user->id)->exists();
    }

    public function isAdmin(User $user): bool
    {
        return $this->memberships()->where('user_id', $user->id)->where('admin', true)->exists();
    }

    public function isProofreader(User $user): bool
    {
        return $this->memberships()->where('user_id', $user->id)->where('proofreader', true)->exists();
    }
}
