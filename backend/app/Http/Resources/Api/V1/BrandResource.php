<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BrandResource extends JsonResource
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
            'name' => $this->name,
            'slug' => $this->slug,
            'logo' => $this->logo_url ?: '/brands/generic.png',
            'logo_url' => $this->logo_url,
            'website' => $this->website,
            'sort_order' => (int) ($this->sort_order ?? 0),
            'is_active' => (bool) $this->is_active,
            'is_featured_on_landing' => (bool) ($this->is_featured_on_landing ?? false),
            'landing_sort_order' => (int) ($this->landing_sort_order ?? 0),
            'products_count' => $this->whenCounted('products'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
