<?php

namespace App\Service\Ai;

use App\Repository\ClimbingRouteRepository;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

class ChatbotService
{
    private const MAX_HISTORY_PAIRS = 10;
    private const SESSION_KEY = 'chatbot_history';
    private const SPAM_KEY = 'chatbot_off_topic_count';
    private const MAX_OFF_TOPIC = 5;

    private const OFF_TOPIC_PATTERNS = [
        // Prompt injection
        '/ignor[ae]\s*(las|tus|estas)\s*instrucciones/iu',
        '/system\s*prompt/i',
        '/olvida\s*(tus|las)\s*(instrucciones|reglas)/iu',
        '/act[uú]a\s*como/iu',
        '/eres\s*ahora/iu',
        '/pretend|roleplay|jailbreak/i',
        // Off topic
        '/pol[ií]tic[ao]/iu',
        '/presidente|gobierno|partido|elecciones/iu',
        '/religi[oó]n|iglesia|dios/iu',
        '/futbol|baloncesto|tenis(?!.*escala)/iu',
        '/programa[cr]|c[oó]digo|javascript|python|php|html/iu',
        '/receta|cocina|ingredientes/iu',
        '/cr[ée]ame\s*(un|una)\s*(historia|cuento|poema|canci[oó]n)/iu',
    ];

    private const GUARD_RESPONSE = 'Solo puedo ayudarte con temas de escalada y búsqueda de rutas. ¿En qué ruta puedo ayudarte?';
    private const BLOCKED_RESPONSE = 'Has enviado demasiados mensajes fuera de tema. Recarga la página para empezar una nueva conversación sobre escalada.';

    public function __construct(
        private readonly AiProviderInterface $aiProvider,
        private readonly PromptBuilder $promptBuilder,
        private readonly ClimbingRouteRepository $routeRepository,
        private readonly RequestStack $requestStack,
        private readonly UrlGeneratorInterface $urlGenerator,
    ) {
    }

    public function handleMessage(string $userMessage): array
    {
        $session = $this->requestStack->getSession();

        // Guard: block if too many off-topic messages
        $offTopicCount = $session->get(self::SPAM_KEY, 0);
        if ($offTopicCount >= self::MAX_OFF_TOPIC) {
            return ['message' => self::BLOCKED_RESPONSE, 'routes' => []];
        }

        // Guard: detect off-topic without calling the API
        if ($this->isOffTopic($userMessage)) {
            $session->set(self::SPAM_KEY, $offTopicCount + 1);

            return ['message' => self::GUARD_RESPONSE, 'routes' => []];
        }

        // Reset counter on legitimate message
        if ($offTopicCount > 0) {
            $session->set(self::SPAM_KEY, 0);
        }

        $history = $session->get(self::SESSION_KEY, []);

        $history[] = ['role' => 'user', 'content' => $userMessage];

        // Step 1: Extract search parameters from natural language
        $extractionPrompt = $this->promptBuilder->buildExtractionPrompt();
        $extractionResponse = $this->aiProvider->chat($extractionPrompt, $history);

        $params = $this->parseSearchParams($extractionResponse);
        $conversationalPart = $this->extractConversationalPart($extractionResponse);

        // Step 2: Query database if params were extracted
        $routes = [];
        $routeCards = [];

        if (null !== $params) {
            $routes = $this->routeRepository->findFiltered(
                $params['name'] ?? null,
                $params['routeType'] ?? null,
                $params['difficulties'] ?? [],
                $params['region'] ?? null,
                null,
                $params['sort'] ?? 'rating_desc',
                max(1, min((int) ($params['maxResults'] ?? 5), 10)),
            );
        }

        if (!empty($routes)) {
            // Use the conversational part from the extraction response
            $aiResponse = $conversationalPart ?: 'He encontrado estas rutas para ti:';

            foreach ($routes as $route) {
                $routeCards[] = [
                    'id' => $route->getId(),
                    'name' => $route->getName(),
                    'difficulty' => $route->getDifficulty(),
                    'routeType' => $route->getRouteType()->value,
                    'routeTypeIcon' => $route->getRouteType()->icon(),
                    'location' => $route->getLocation()->getName(),
                    'region' => $route->getLocation()->getRegion(),
                    'rating' => $route->getRating(),
                    'length' => $route->getLength(),
                    'pitches' => $route->getPitches(),
                    'url' => $this->urlGenerator->generate('app_route_show', ['id' => $route->getId()]),
                ];
            }
        } elseif (null !== $params) {
            // Search was attempted but no results found
            $routeType = $params['routeType'] ?? 'escalada';
            $aiResponse = "No he encontrado rutas de {$routeType} con esos criterios. Prueba a ampliar la búsqueda con otra dificultad, otro tipo de ruta o sin filtrar por región.";
        } else {
            // No search requested: use conversational response
            $aiResponse = $conversationalPart ?: $extractionResponse;
            // Clean any leftover JSON blocks
            $aiResponse = $this->extractConversationalPart($aiResponse);
            if ('' === trim($aiResponse)) {
                $aiResponse = $extractionResponse;
            }
        }

        $history[] = ['role' => 'assistant', 'content' => $aiResponse];

        // Trim history to manage token usage
        if (count($history) > self::MAX_HISTORY_PAIRS * 2) {
            $history = array_slice($history, -(self::MAX_HISTORY_PAIRS * 2));
        }

        $session->set(self::SESSION_KEY, $history);

        return [
            'message' => $aiResponse,
            'routes' => $routeCards,
        ];
    }

    public function clearHistory(): void
    {
        $session = $this->requestStack->getSession();
        $session->remove(self::SESSION_KEY);
        $session->remove(self::SPAM_KEY);
    }

    private function isOffTopic(string $message): bool
    {
        foreach (self::OFF_TOPIC_PATTERNS as $pattern) {
            if (preg_match($pattern, $message)) {
                return true;
            }
        }

        return false;
    }

    private function parseSearchParams(string $response): ?array
    {
        if (preg_match('/```json\s*(\{.*?\})\s*```/s', $response, $matches)) {
            $params = json_decode($matches[1], true);
            if (JSON_ERROR_NONE === json_last_error()) {
                return $params;
            }
        }

        return null;
    }

    private function extractConversationalPart(string $response): string
    {
        return trim(preg_replace('/```json\s*\{.*?\}\s*```/s', '', $response));
    }
}
