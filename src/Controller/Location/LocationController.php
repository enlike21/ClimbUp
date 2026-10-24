<?php

namespace App\Controller\Location;

use App\Repository\ClimbingRouteRepository;
use App\Repository\LocationRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class LocationController extends AbstractController
{
    #[Route('/location/{id}', name: 'location_routes', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function routes(int $id, LocationRepository $locationRepository, ClimbingRouteRepository $routeRepository): Response
    {
        $location = $locationRepository->find($id);
        if (!$location) {
            throw $this->createNotFoundException('Ubicación no encontrada.');
        }

        $routes = $routeRepository->findBy(['location' => $location]);

        return $this->render('location/location_routes.html.twig', [
            'location' => $location,
            'routes' => $routes,
        ]);
    }
}
