<?php

namespace App\Tests\Service;

use App\Service\LocationNameParser;
use PHPUnit\Framework\TestCase;

class LocationNameParserTest extends TestCase
{
    private LocationNameParser $parser;

    protected function setUp(): void
    {
        $this->parser = new LocationNameParser();
    }

    public function testFullPathWithGenericSuffixes(): void
    {
        $result = $this->parser->parse('La Roca del Arcs > Montsec > Lleida > Catalonia > Spain > Europe > International');

        $this->assertSame('Lleida', $result['name']);
        $this->assertSame('Cataluña', $result['region']);
        $this->assertSame('La Roca del Arcs > Montsec', $result['sector']);
    }

    public function testTranslatesKnownEnglishRegionNames(): void
    {
        $result = $this->parser->parse('Frontales > El Chorro > Andalucia > Spain');

        $this->assertSame('El Chorro', $result['name']);
        $this->assertSame('Andalucía', $result['region']);
        $this->assertSame('Frontales', $result['sector']);
    }

    public function testUnknownRegionPassesThroughUntranslated(): void
    {
        $result = $this->parser->parse('Sector > Venue > Madrid > Spain');

        $this->assertSame('Madrid', $result['region']);
    }

    public function testTwoSegmentsHasNoSector(): void
    {
        $result = $this->parser->parse('Venue > Region');

        $this->assertSame('Venue', $result['name']);
        $this->assertSame('Region', $result['region']);
        $this->assertNull($result['sector']);
    }

    public function testSingleSegmentHasNoRegionOrSector(): void
    {
        $result = $this->parser->parse('JustAName');

        $this->assertSame('JustAName', $result['name']);
        $this->assertNull($result['region']);
        $this->assertNull($result['sector']);
    }

    public function testMultipleSectorsCollapseToSameVenue(): void
    {
        $a = $this->parser->parse('Frontales > El Chorro > Andalucia > Spain > Europe > International');
        $b = $this->parser->parse('Desplomilandia > El Chorro > Andalucia > Spain > Europe > International');

        $this->assertSame($a['name'], $b['name']);
        $this->assertSame($a['region'], $b['region']);
        $this->assertNotSame($a['sector'], $b['sector']);
    }
}
