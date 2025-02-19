<?php

namespace App\Controller\Location;

use App\Repository\ClimbingRouteRepository;
use App\Repository\LocationRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class MapController extends AbstractController
{
    #[Route('/map', name: 'map')]
    public function index()
    {
        return $this->render('location/map.html.twig');
    }

    #[Route('/api/locations', name: 'api_locations')]
    public function getLocations(LocationRepository $locationRepository): JsonResponse
    {
        $locations = $locationRepository->findAll();
        $data = array_map(fn($location) => [
            'id' => $location->getId(),
            'name' => $location->getName(),
            'latitude' => $location->getLatitude(),
            'longitude' => $location->getLongitude(),
        ], $locations);

        return new JsonResponse($data);
    }

    #[Route('/api/routes', name: 'api_routes', methods: ['GET'])]
    public function getRoutes(ClimbingRouteRepository $routeRepository): JsonResponse
    {
        $routes = $routeRepository->findAll();

        $data = array_map(function ($route) {
            return [
                'id' => $route->getId(),
                'name' => $route->getName(),
                'type' => $route->getRouteType() ? $route->getRouteType() : null,
                'location' => $route->getLocation() ? [
                    'id' => $route->getLocation()->getId(),
                    'name' => $route->getLocation()->getName(),
                    'latitude' => $route->getLocation()->getLatitude(),
                    'longitude' => $route->getLocation()->getLongitude(),
                ] : null
            ];
        }, $routes);

        return new JsonResponse($data);
    }
}
