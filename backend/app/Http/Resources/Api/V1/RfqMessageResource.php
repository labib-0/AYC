<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RfqMessageResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'rfq_id' => (string) $this->quote_id,
            'rfqId' => (string) $this->quote_id,
            'user_id' => $this->user_id ? (string) $this->user_id : null,
            'sender_role' => $this->sender_role,
            'senderRole' => $this->sender_role,
            'sender_name' => $this->sender_name,
            'senderName' => $this->sender_name,
            'message' => $this->message,
            'read_at' => $this->read_at?->toISOString(),
            'readAt' => $this->read_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}
