<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductImageResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'image_url' => $this->image_url,
            'alt_text' => $this->alt_text,
            'sort_order' => (int) ($this->sort_order ?? 0),
            'is_primary' => (bool) $this->is_primary,
        ];
    }
}
