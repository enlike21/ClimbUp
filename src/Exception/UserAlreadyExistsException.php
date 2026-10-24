<?php

namespace App\Exception;

class UserAlreadyExistsException extends \RuntimeException
{
    public function __construct(string $message = '', ?\Throwable $previous = null)
    {
        parent::__construct($message ?: 'This email is already registered', 0, $previous);
    }
}
