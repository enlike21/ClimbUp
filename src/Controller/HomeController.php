<?php

namespace App\Controller;

use App\Service\StatisticsService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class HomeController extends AbstractController
{
    #[Route('/', name: 'homepage')]
    public function index(StatisticsService $statisticsService): Response
    {
        return $this->render('homepage.html.twig', [
            'stats' => $statisticsService->getGeneralStats(),
        ]);
    }

    #[Route('/sobre-mi', name: 'about')]
    public function about(): Response
    {
        return $this->render('about.html.twig');
    }
}
