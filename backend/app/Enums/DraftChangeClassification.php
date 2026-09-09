<?php

declare(strict_types=1);

namespace App\Enums;

enum DraftChangeClassification: string
{
    case Semantic = 'semantic';
    case Typo = 'typo';
}
