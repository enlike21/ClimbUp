<?php

namespace App\Command;

use App\Entity\ClimbingRoute;
use App\Entity\Location;
use App\Enum\RouteType;
use App\Service\GradeConversionService;
use App\Service\LocationNameParser;
use App\Service\StatisticsService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:import-routes',
    description: 'Import climbing routes from a CSV in Mountain Project\'s export format (see data/sample_routes.csv)',
)]
class ImportRoutesCommand extends Command
{
    private const BATCH_SIZE = 50;

    private const ROUTE_TYPE_MAP = [
        'sport' => RouteType::SPORT,
        'trad' => RouteType::TRAD,
        'boulder' => RouteType::BOULDER,
        'tr' => RouteType::TOPROPE,
        'toprope' => RouteType::TOPROPE,
        'aid' => RouteType::AID,
        'alpine' => RouteType::ALPINE,
    ];

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly GradeConversionService $gradeConverter,
        private readonly StatisticsService $statisticsService,
        private readonly LocationNameParser $locationNameParser,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('file', InputArgument::REQUIRED, 'Path to the CSV file, e.g. data/sample_routes.csv')
            ->addOption('clean', null, InputOption::VALUE_NONE, 'Delete all existing routes and locations before importing');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $filePath = $input->getArgument('file');

        if (!file_exists($filePath) || !is_readable($filePath)) {
            $io->error("File not found or not readable: $filePath");

            return Command::FAILURE;
        }

        if ($input->getOption('clean')) {
            $this->cleanDatabase($io);
        }

        return $this->importCsv($filePath, $io);
    }

    private function cleanDatabase(SymfonyStyle $io): void
    {
        $io->section('Cleaning existing data...');
        $connection = $this->entityManager->getConnection();

        $connection->executeStatement('SET FOREIGN_KEY_CHECKS = 0');
        $connection->executeStatement('DELETE FROM completed_route');
        $connection->executeStatement('DELETE FROM user_route');
        $connection->executeStatement('DELETE FROM climbing_route');
        $connection->executeStatement('DELETE FROM location');
        $connection->executeStatement('ALTER TABLE climbing_route AUTO_INCREMENT = 1');
        $connection->executeStatement('ALTER TABLE location AUTO_INCREMENT = 1');
        $connection->executeStatement('SET FOREIGN_KEY_CHECKS = 1');

        $this->entityManager->clear();
        $io->success('Existing data cleaned.');
    }

    private function importCsv(string $filePath, SymfonyStyle $io): int
    {
        $io->section('Importing routes from CSV...');

        $handle = fopen($filePath, 'r');
        if (false === $handle) {
            $io->error('Could not open file.');

            return Command::FAILURE;
        }

        $header = fgetcsv($handle, null, ',', '"', '');
        if (false === $header) {
            $io->error('Could not read CSV header.');
            fclose($handle);

            return Command::FAILURE;
        }

        $header = array_map('trim', $header);
        $columnMap = array_flip($header);

        $requiredColumns = ['Route', 'Location', 'Route Type', 'Rating'];
        foreach ($requiredColumns as $col) {
            if (!isset($columnMap[$col])) {
                $io->error("Missing required column: $col");
                fclose($handle);

                return Command::FAILURE;
            }
        }

        $locationCache = [];
        $imported = 0;
        $skipped = 0;
        $rowNumber = 1;

        while (($row = fgetcsv($handle, null, ',', '"', '')) !== false) {
            ++$rowNumber;

            if (count($row) !== count($header)) {
                ++$skipped;
                continue;
            }

            $data = array_combine($header, $row);

            $routeName = trim($data['Route'] ?? '');
            $locationStr = trim($data['Location'] ?? '');
            $routeTypeStr = trim($data['Route Type'] ?? '');
            $ratingStr = trim($data['Rating'] ?? '');

            if ('' === $routeName || '' === $locationStr || '' === $routeTypeStr || '' === $ratingStr) {
                ++$skipped;
                continue;
            }

            $routeType = $this->parseRouteType($routeTypeStr);
            if (null === $routeType) {
                ++$skipped;
                continue;
            }

            $parsedLocation = $this->locationNameParser->parse($locationStr);
            $locationKey = $parsedLocation['name'].'|'.$parsedLocation['region'];

            if (!isset($locationCache[$locationKey])) {
                $location = $this->entityManager->getRepository(Location::class)->findOneBy([
                    'name' => $parsedLocation['name'],
                    'region' => $parsedLocation['region'],
                ]);

                if (null === $location) {
                    $location = new Location();
                    $location->setName($parsedLocation['name']);
                    $location->setRegion($parsedLocation['region']);
                    $location->setLatitude((float) ($data['Area Latitude'] ?? 0));
                    $location->setLongitude((float) ($data['Area Longitude'] ?? 0));
                    $this->entityManager->persist($location);
                }

                $locationCache[$locationKey] = $location;
            }

            $location = $locationCache[$locationKey];

            $route = new ClimbingRoute();
            $route->setName($routeName);
            $route->setRouteType($routeType);
            $convertedGrade = $this->gradeConverter->convert($ratingStr);
            $route->setDifficulty($convertedGrade);
            $route->setDifficultyOrder($this->gradeConverter->getOrder($convertedGrade));
            $route->setLocation($location);
            $route->setSector($parsedLocation['sector']);
            $route->setRating($this->parseStars($data['Avg Stars'] ?? ''));
            $route->setUrl(trim($data['URL'] ?? '') ?: null);
            $route->setPitches(max(1, (int) ($data['Pitches'] ?? 1)));
            $route->setLength($this->parseLength($data['Length'] ?? ''));

            $this->entityManager->persist($route);
            ++$imported;

            if (0 === $imported % self::BATCH_SIZE) {
                $this->entityManager->flush();
                $this->entityManager->clear();
                $locationCache = $this->rebuildLocationCache($locationCache);
                $io->text("Processed $imported routes...");
            }
        }

        $this->entityManager->flush();
        fclose($handle);
        $this->statisticsService->invalidateGeneralStats();

        $io->success("Import complete: $imported routes imported, $skipped rows skipped.");

        return Command::SUCCESS;
    }

    private function parseRouteType(string $typeStr): ?RouteType
    {
        // Mountain Project can have combined types like "Sport, Trad" or "Trad, Aid"
        // Take the first type
        $types = array_map('trim', explode(',', $typeStr));
        $first = strtolower($types[0]);

        return self::ROUTE_TYPE_MAP[$first] ?? null;
    }

    private function parseStars(string $starsStr): ?float
    {
        $value = (float) $starsStr;

        return $value > 0 ? $value : null;
    }

    private function parseLength(string $lengthStr): int
    {
        // Mountain Project uses feet, e.g. "80'" or "80 ft"
        $cleaned = preg_replace('/[^0-9.]/', '', $lengthStr);
        $feet = (float) $cleaned;

        if ($feet > 0) {
            return (int) round($feet * 0.3048);
        }

        return 0;
    }

    /**
     * After EntityManager::clear(), managed entities are detached.
     * Rebuild the cache by re-fetching locations from DB.
     */
    private function rebuildLocationCache(array $oldCache): array
    {
        $newCache = [];
        $repo = $this->entityManager->getRepository(Location::class);

        foreach ($oldCache as $key => $location) {
            $parts = explode('|', $key);
            $found = $repo->findOneBy([
                'name' => $parts[0],
                'region' => '' === $parts[1] ? null : $parts[1],
            ]);
            if (null !== $found) {
                $newCache[$key] = $found;
            }
        }

        return $newCache;
    }
}
