<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\ScanBrokenLinks;
use App\Models\System;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Description('Scan a system for dangling rule references and report them')]
#[Signature('lint:broken-links {system : System slug or ULID to lint}')]
final class LintBrokenLinks extends Command
{
    public function handle(ScanBrokenLinks $scan): int
    {
        $identifier = (string) $this->argument('system');

        $system = System::query()
            ->where('slug', $identifier)
            ->orWhere('id', $identifier)
            ->first();

        if ($system === null) {
            $this->error('System not found: '.$identifier);

            return self::FAILURE;
        }

        $broken = $scan->execute($system);

        if ($broken === []) {
            $this->info(sprintf('No broken links found in system "%s".', $system->slug));

            return self::SUCCESS;
        }

        foreach ($broken as $reference) {
            $this->warn(sprintf(
                '[%s] %s "%s" references "%s" (%s)',
                $reference->module,
                $reference->kind->value,
                $reference->location,
                $reference->reference,
                $reference->reason->value,
            ));
        }

        $this->error(sprintf('%d broken link(s) found in system "%s".', count($broken), $system->slug));

        return self::FAILURE;
    }
}
