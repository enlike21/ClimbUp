<?php

namespace App\Service;

class LocationNameParser
{
    private const REGION_TRANSLATIONS = [
        'Catalonia' => 'Cataluña',
        'Canary Islands' => 'Islas Canarias',
        'Castile - La Mancha' => 'Castilla-La Mancha',
        'Castile y Leon' => 'Castilla y León',
        'Andalucia' => 'Andalucía',
        'Aragon' => 'Aragón',
    ];

    /**
     * Parse a Mountain Project style location path into name/region/sector.
     *
     * Actual format: "Sector > Zone > Province > Region > Spain > Europe > International"
     * We strip trailing generic levels (International, Europe, Spain) first,
     * then: region = last remaining, name = second-to-last, sector = everything left.
     *
     * Example: "La Roca del Arcs > Montsec > Lleida > Catalonia > Spain > Europe > International"
     * → name = "Lleida", region = "Cataluña", sector = "La Roca del Arcs > Montsec"
     *
     * @return array{name: string, region: ?string, sector: ?string}
     */
    public function parse(string $locationStr): array
    {
        $parts = array_map('trim', explode('>', $locationStr));

        $genericSuffixes = ['international', 'europe', 'spain', 'españa'];
        while (count($parts) > 1 && in_array(strtolower(end($parts)), $genericSuffixes, true)) {
            array_pop($parts);
        }

        $count = count($parts);

        if ($count >= 3) {
            $region = $parts[$count - 1];
            $name = $parts[$count - 2];
            $sectorParts = array_slice($parts, 0, $count - 2);
            $sector = implode(' > ', $sectorParts);
        } elseif (2 === $count) {
            $region = $parts[1];
            $name = $parts[0];
            $sector = null;
        } else {
            $name = $parts[0];
            $region = null;
            $sector = null;
        }

        if (null !== $region && isset(self::REGION_TRANSLATIONS[$region])) {
            $region = self::REGION_TRANSLATIONS[$region];
        }

        return [
            'name' => $name,
            'region' => $region,
            'sector' => $sector ?: null,
        ];
    }
}
