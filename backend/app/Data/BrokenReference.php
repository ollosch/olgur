<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\BrokenReferenceKind;
use App\Enums\BrokenReferenceReason;

/**
 * A single dangling rule reference reported by the broken-link lint.
 *
 * @see \App\Services\BrokenLinkLinter
 */
final readonly class BrokenReference
{
    public function __construct(
        /** Slug of the module whose content contains the dangling reference. */
        public string $module,
        /** Where the reference lives: a rule number, or an index-entry term. */
        public string $location,
        /** Whether the location is a rule or an index entry. */
        public BrokenReferenceKind $kind,
        /** The raw reference that failed to resolve (a `{{L:…}}` token or a `rule_refs` value). */
        public string $reference,
        /** Why the reference failed to resolve. */
        public BrokenReferenceReason $reason,
    ) {}
}
