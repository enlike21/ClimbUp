<?php

namespace App\Command;

use App\Service\LocationNameParser;
use App\Service\StatisticsService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * One-off data-cleanup command for locations imported before the location
 * name/region/sector parsing existed. Those rows have the raw Mountain
 * Project path (e.g. "Frontales > El Chorro > Andalucia > España") stored
 * verbatim as the location name, with no region set.
 *
 * Distinct raw paths that resolve to the same clean (name, region) venue
 * (e.g. several sectors of "El Chorro") are merged into a single location,
 * and each route's original sector is preserved on the route itself.
 */
#[AsCommand(
    name: 'app:fix-location-data',
    description: 'Re-parse raw imported location names into name/region and merge duplicate locations',
)]
class FixLocationDataCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly LocationNameParser $locationNameParser,
        private readonly StatisticsService $statisticsService,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('dry-run', null, InputOption::VALUE_NONE, 'Preview the changes without writing to the database');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $dryRun = (bool) $input->getOption('dry-run');
        $connection = $this->entityManager->getConnection();

        $locations = $connection->fetchAllAssociative('SELECT id, name, region FROM location');

        /** @var array<string, array{id: int, name: string, region: ?string}> $canonical */
        $canonical = [];
        /** @var array<int, int> $mergeInto */
        $mergeInto = [];
        /** @var array<int, ?string> $sectorByLocationId */
        $sectorByLocationId = [];

        foreach ($locations as $row) {
            // Already-clean rows never contain the raw "A > B > C" path.
            if (!str_contains($row['name'], '>')) {
                continue;
            }

            $parsed = $this->locationNameParser->parse($row['name']);
            $key = $parsed['name'].'|'.($parsed['region'] ?? '');
            $sectorByLocationId[(int) $row['id']] = $parsed['sector'];

            if (!isset($canonical[$key])) {
                $canonical[$key] = ['id' => (int) $row['id'], 'name' => $parsed['name'], 'region' => $parsed['region']];
            } else {
                $mergeInto[(int) $row['id']] = $canonical[$key]['id'];
            }
        }

        if ([] === $sectorByLocationId) {
            $io->success('Nothing to do: no raw (unparsed) location names found.');

            return Command::SUCCESS;
        }

        $io->section(sprintf(
            'Found %d raw location rows, resolving to %d clean venues (%d duplicate rows will be merged away).',
            count($sectorByLocationId),
            count($canonical),
            count($mergeInto),
        ));

        if ($dryRun) {
            $rows = [];
            foreach ($canonical as $key => $data) {
                [$name, $region] = explode('|', $key, 2);
                $rows[] = [$data['id'], $name, $region ?: '—'];
            }
            $io->table(['Canonical Location ID', 'Name', 'Region'], $rows);
            $io->note('Dry run: no changes were written.');

            return Command::SUCCESS;
        }

        $this->entityManager->wrapInTransaction(function () use ($canonical, $mergeInto, $sectorByLocationId, $connection): void {
            foreach ($canonical as $data) {
                $connection->executeStatement(
                    'UPDATE location SET name = ?, region = ? WHERE id = ?',
                    [$data['name'], $data['region'], $data['id']],
                );
            }

            foreach ($sectorByLocationId as $locationId => $sector) {
                $canonicalId = $mergeInto[$locationId] ?? $locationId;
                $connection->executeStatement(
                    'UPDATE climbing_route SET location_id = ?, sector = ? WHERE location_id = ?',
                    [$canonicalId, $sector, $locationId],
                );
            }

            if ([] !== $mergeInto) {
                $duplicateIds = array_keys($mergeInto);
                $placeholders = implode(',', array_fill(0, count($duplicateIds), '?'));
                $connection->executeStatement("DELETE FROM location WHERE id IN ($placeholders)", $duplicateIds);
            }
        });

        $this->statisticsService->invalidateGeneralStats();

        $io->success(sprintf(
            'Cleaned %d locations into %d venues and removed %d duplicates.',
            count($sectorByLocationId),
            count($canonical),
            count($mergeInto),
        ));

        return Command::SUCCESS;
    }
}
