<?php

declare(strict_types=1);

namespace App\Enums;

enum BrokenReferenceReason: string
{
    case UnknownNumber = 'unknown_number';
    case UnknownSlug = 'unknown_slug';
}
