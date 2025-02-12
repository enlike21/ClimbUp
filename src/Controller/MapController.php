<?php
namespace App\Controller;

use App\Repository\LocationRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\JsonResponse;

class MapController extends AbstractController
{
#[Route('/map', name: 'map')]
public function index()
{
return $this->render('map.html.twig');
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
}
