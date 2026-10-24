<?php

namespace App\Controller\User;

use App\Entity\User;
use App\Service\StatisticsService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class PublicProfileController extends AbstractController
{
    #[Route('/escalador/{id}', name: 'app_public_profile', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function show(User $user, StatisticsService $statisticsService): Response
    {
        return $this->render('profile/public_profile.html.twig', [
            'profileUser' => $user,
            'stats' => $statisticsService->getUserStats($user),
        ]);
    }
}
