<?php

namespace App\Tests\Entity;

use App\Entity\ClimbingRoute;
use App\Enum\RouteType;
use PHPUnit\Framework\TestCase;

class ClimbingRouteTest extends TestCase
{
    public function testRouteTypeRoundTripsThroughBackedEnum(): void
    {
        $route = new ClimbingRoute();
        $route->setRouteType(RouteType::BOULDER);

        $this->assertSame(RouteType::BOULDER, $route->getRouteType());
        $this->assertSame('Boulder', $route->getRouteType()->value);
    }

    public function testFluentSettersReturnSameInstance(): void
    {
        $route = new ClimbingRoute();

        $this->assertSame($route, $route->setName('La Rambla'));
        $this->assertSame($route, $route->setDifficulty('9a+'));
        $this->assertSame($route, $route->setPitches(1));
        $this->assertSame($route, $route->setLength(45));
    }
}
