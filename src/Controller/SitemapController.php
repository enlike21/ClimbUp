<?php

namespace App\Controller;

use App\Repository\ClimbingRouteRepository;
use App\Repository\LocationRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

class SitemapController extends AbstractController
{
    #[Route('/sitemap.xml', name: 'sitemap', defaults: ['_format' => 'xml'])]
    public function sitemap(
        ClimbingRouteRepository $routeRepository,
        LocationRepository $locationRepository,
    ): Response {
        $urls = [];

        // Static pages
        $urls[] = [
            'loc' => $this->generateUrl('homepage', [], UrlGeneratorInterface::ABSOLUTE_URL),
            'priority' => '1.0',
            'changefreq' => 'daily',
        ];
        $urls[] = [
            'loc' => $this->generateUrl('app_route_user_view', [], UrlGeneratorInterface::ABSOLUTE_URL),
            'priority' => '0.9',
            'changefreq' => 'daily',
        ];
        $urls[] = [
            'loc' => $this->generateUrl('map', [], UrlGeneratorInterface::ABSOLUTE_URL),
            'priority' => '0.8',
            'changefreq' => 'weekly',
        ];
        $urls[] = [
            'loc' => $this->generateUrl('login', [], UrlGeneratorInterface::ABSOLUTE_URL),
            'priority' => '0.5',
            'changefreq' => 'monthly',
        ];
        $urls[] = [
            'loc' => $this->generateUrl('app_register', [], UrlGeneratorInterface::ABSOLUTE_URL),
            'priority' => '0.5',
            'changefreq' => 'monthly',
        ];
        $urls[] = [
            'loc' => $this->generateUrl('about', [], UrlGeneratorInterface::ABSOLUTE_URL),
            'priority' => '0.5',
            'changefreq' => 'monthly',
        ];

        // Dynamic route pages
        $routes = $routeRepository->findAll();
        foreach ($routes as $route) {
            $urls[] = [
                'loc' => $this->generateUrl('app_route_show', ['id' => $route->getId()], UrlGeneratorInterface::ABSOLUTE_URL),
                'priority' => '0.7',
                'changefreq' => 'weekly',
            ];
        }

        // Location pages
        $locations = $locationRepository->findAll();
        foreach ($locations as $location) {
            $urls[] = [
                'loc' => $this->generateUrl('location_routes', ['id' => $location->getId()], UrlGeneratorInterface::ABSOLUTE_URL),
                'priority' => '0.7',
                'changefreq' => 'weekly',
            ];
        }

        $response = new Response(
            $this->renderView('sitemap.xml.twig', ['urls' => $urls]),
            200,
            ['Content-Type' => 'text/xml']
        );

        return $response;
    }
}
