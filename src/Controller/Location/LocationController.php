<?php
namespace App\Controller\Location;

use App\Repository\ClimbingRouteRepository;
use App\Repository\LocationRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Routing\Annotation\Route;

class LocationController extends AbstractController
{
#[Route('/location/{id}', name: 'location_routes')]
public function routes($id, LocationRepository $locationRepository, ClimbingRouteRepository $routeRepository)
{
$location = $locationRepository->find($id);
if (!$location) {
throw $this->createNotFoundException("Ubicación no encontrada.");
}

$routes = $routeRepository->findBy(['location' => $location]);

return $this->render('location/location_routes.html.twig', [
'location' => $location,
'routes' => $routes
]);
}
}
