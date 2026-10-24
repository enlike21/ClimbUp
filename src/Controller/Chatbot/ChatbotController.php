<?php

namespace App\Controller\Chatbot;

use App\Service\Ai\ChatbotService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

class ChatbotController extends AbstractController
{
    #[Route('/asistente', name: 'app_chatbot', methods: ['GET'])]
    public function index(): Response
    {
        return $this->render('chatbot/index.html.twig');
    }

    #[Route('/api/chat', name: 'api_chat', methods: ['POST'])]
    public function chat(
        Request $request,
        ChatbotService $chatbotService,
        RateLimiterFactoryInterface $chatbotLimiter,
    ): JsonResponse {
        $limiter = $chatbotLimiter->create($request->getClientIp());
        if (!$limiter->consume()->isAccepted()) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Demasiadas peticiones. Espera un momento antes de enviar otro mensaje.',
            ], 429);
        }

        $data = json_decode($request->getContent(), true);
        $message = trim($data['message'] ?? '');

        if ('' === $message) {
            return new JsonResponse([
                'success' => false,
                'message' => 'El mensaje no puede estar vacío.',
            ], 400);
        }

        if (mb_strlen($message) > 500) {
            return new JsonResponse([
                'success' => false,
                'message' => 'El mensaje es demasiado largo (máximo 500 caracteres).',
            ], 400);
        }

        try {
            $result = $chatbotService->handleMessage($message);

            return new JsonResponse([
                'success' => true,
                'message' => $result['message'],
                'routes' => $result['routes'],
            ]);
        } catch (\RuntimeException $e) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Lo siento, hubo un error procesando tu consulta. Inténtalo de nuevo.',
            ], 503);
        }
    }

    #[Route('/api/chat/clear', name: 'api_chat_clear', methods: ['POST'])]
    public function clearHistory(ChatbotService $chatbotService): JsonResponse
    {
        $chatbotService->clearHistory();

        return new JsonResponse([
            'success' => true,
            'message' => 'Historial borrado.',
        ]);
    }
}
