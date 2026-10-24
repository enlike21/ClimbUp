<?php

namespace App\Service\Ai;

interface AiProviderInterface
{
    /**
     * @param array<array{role: string, content: string}> $messages
     */
    public function chat(string $systemPrompt, array $messages): string;
}
