<?php

namespace App\Controller\Location;

use App\Repository\ClimbingRouteRepository;
use App\Repository\LocationRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class MapController extends AbstractController
{
    #[Route('/map', name: 'map')]
    public function index(): Response
    {
        return $this->render('location/map.html.twig');
    }

    #[Route('/api/locations', name: 'api_locations', methods: ['GET'])]
    public function getLocations(LocationRepository $locationRepository): JsonResponse
    {
        $data = $locationRepository->findAllWithRouteCounts();

        return new JsonResponse($data);
    }

    #[Route('/api/routes', name: 'api_routes', methods: ['GET'])]
    public function getRoutes(ClimbingRouteRepository $routeRepository): JsonResponse
    {
        $routes = $routeRepository->findAllWithLocation();

        $data = array_map(function ($route) {
            $location = $route->getLocation();

            return [
                'id' => $route->getId(),
                'name' => $route->getName(),
                'type' => $route->getRouteType()->value,
                'sector' => $route->getSector(),
                'location' => [
                    'id' => $location->getId(),
                    'name' => $location->getName(),
                    'latitude' => $location->getLatitude(),
                    'longitude' => $location->getLongitude(),
                    'region' => $location->getRegion(),
                ],
            ];
        }, $routes);

        return new JsonResponse($data);
    }
}
