<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\MembershipFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property array<string, mixed>|null $config
 */
#[Fillable(['user_id', 'system_id', 'admin', 'config'])]
final class Membership extends Model
{
    /** @use HasFactory<MembershipFactory> */
    use HasFactory;

    use HasUlids;

    protected $table = 'memberships';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'admin' => 'boolean',
            'config' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<System, $this>
     */
    public function system(): BelongsTo
    {
        return $this->belongsTo(System::class);
    }

    public function isMember(User $user): bool
    {
        return $this->user_id === $user->id;
    }
}
