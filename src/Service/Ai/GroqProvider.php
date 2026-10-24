<?php

namespace App\Service\Ai;

use Symfony\Contracts\HttpClient\HttpClientInterface;

class GroqProvider implements AiProviderInterface
{
    private const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    private const MODEL = 'openai/gpt-oss-20b';

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly string $groqApiKey,
    ) {
    }

    public function chat(string $systemPrompt, array $messages): string
    {
        $apiMessages = [
            ['role' => 'system', 'content' => $systemPrompt],
        ];

        foreach ($messages as $msg) {
            $apiMessages[] = [
                'role' => 'assistant' === $msg['role'] ? 'assistant' : 'user',
                'content' => $msg['content'],
            ];
        }

        $response = $this->httpClient->request('POST', self::API_URL, [
            'headers' => [
                'Authorization' => 'Bearer '.$this->groqApiKey,
            ],
            'json' => [
                'model' => self::MODEL,
                'messages' => $apiMessages,
                'temperature' => 0.3,
                'max_tokens' => 1024,
            ],
        ]);

        $statusCode = $response->getStatusCode();
        if (429 === $statusCode) {
            throw new \RuntimeException('Groq API rate limit exceeded');
        }
        if ($statusCode >= 500) {
            throw new \RuntimeException('Groq API temporarily unavailable');
        }

        $data = $response->toArray();

        return $data['choices'][0]['message']['content']
            ?? throw new \RuntimeException('No response from Groq API');
    }
}
