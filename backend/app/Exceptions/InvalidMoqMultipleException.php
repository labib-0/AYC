<?php

namespace App\Exceptions;

use Exception;

class InvalidMoqMultipleException extends Exception
{
    protected array $data;

    public function __construct(string $message, array $data = [], int $code = 422, ?\Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
        $this->data = $data;
    }

    public function getData(): array
    {
        return $this->data;
    }
}
