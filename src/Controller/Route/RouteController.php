<?php

namespace App\Controller\Route;

use App\Entity\ClimbingRoute;
use App\Repository\ClimbingRouteRepository;
use App\Repository\LocationRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/route')]
class RouteController extends AbstractController
{
    #[Route('/user_routes', name: 'app_route_user_view', methods: ['GET'])]
    public function userView(Request $request, ClimbingRouteRepository $routeRepository, LocationRepository $locationRepository): Response
    {
        $name = $request->query->get('name', '');
        $routeType = $request->query->get('route_type', '');
        $region = $request->query->get('region', '');
        $locationRaw = $request->query->get('location', '');
        $locationId = '' !== $locationRaw ? (int) $locationRaw : null;
        $sort = $request->query->get('sort', 'rating_desc');
        $diffParam = $request->query->get('difficulty', '');
        $difficulties = $diffParam ? array_filter(explode(',', $diffParam)) : [];

        $page = max(1, $request->query->getInt('page', 1));
        $perPage = min(100, max(1, $request->query->getInt('per_page', 30)));
        $result = $routeRepository->findFilteredPage(
            $name ?: null,
            $routeType ?: null,
            $difficulties,
            $region ?: null,
            $locationId,
            $sort,
            $page,
            $perPage,
        );
        $totalRoutes = $result['total'];
        $totalPages = max(1, (int) ceil($totalRoutes / $perPage));
        $paginatedRoutes = $result['routes'];
        if ($page > $totalPages) {
            // Past the last page (e.g. after narrowing the filters): show the last one.
            $page = $totalPages;
            $paginatedRoutes = $routeRepository->findFilteredPage(
                $name ?: null, $routeType ?: null, $difficulties, $region ?: null, $locationId, $sort, $page, $perPage,
            )['routes'];
        }

        $templateVars = [
            'routes' => $paginatedRoutes,
            'page' => $page,
            'per_page' => $perPage,
            'total_routes' => $totalRoutes,
            'total_pages' => $totalPages,
            'sort' => $sort,
        ];

        if ($request->isXmlHttpRequest()) {
            return $this->render('route/list/_routes_results.html.twig', $templateVars);
        }

        $regions = $locationRepository->findDistinctRegions();
        $locations = $locationRepository->findAllSorted();

        return $this->render('route/list/routes_lists.html.twig', $templateVars + [
            'regions' => $regions,
            'locations' => $locations,
        ]);
    }

    #[Route('/{id}', name: 'app_route_show', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function show(ClimbingRoute $route, ClimbingRouteRepository $routeRepository): Response
    {
        return $this->render('route/details/show.html.twig', [
            'route' => $route,
            'similarRoutes' => $routeRepository->findSimilar($route),
        ]);
    }
}
