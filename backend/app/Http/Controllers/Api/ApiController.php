<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class ApiController extends Controller
{
    /**
     * Standard successful JSON response
     */
    protected function success(mixed $data = null, string $message = 'Success', int $status = Response::HTTP_OK): JsonResponse
    {
        $payload = [
            'success' => true,
            'message' => $message,
        ];

        if (!is_null($data)) {
            $payload['data'] = $data;
        }

        return response()->json($payload, $status);
    }

    /**
     * Standard error JSON response
     */
    protected function error(string $message = 'Error', int $status = Response::HTTP_BAD_REQUEST, mixed $errors = null): JsonResponse
    {
        $payload = [
            'success' => false,
            'message' => $message,
        ];

        if (!is_null($errors)) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }

    /**
     * Standard 404 Not Found JSON response
     */
    protected function notFound(string $message = 'Resource not found'): JsonResponse
    {
        return $this->error($message, Response::HTTP_NOT_FOUND);
    }

    /**
     * Standard 403 Forbidden JSON response
     */
    protected function forbidden(string $message = 'Unauthorized action'): JsonResponse
    {
        return $this->error($message, Response::HTTP_FORBIDDEN);
    }

    /**
     * Standard 401 Unauthorized JSON response
     */
    protected function unauthorized(string $message = 'Unauthenticated'): JsonResponse
    {
        return $this->error($message, Response::HTTP_UNAUTHORIZED);
    }

    /**
     * Standard 500 Internal Server Error JSON response
     */
    protected function serverError(string $message = 'An internal server error occurred.', mixed $errors = null): JsonResponse
    {
        return $this->error($message, Response::HTTP_INTERNAL_SERVER_ERROR, $errors);
    }
}
