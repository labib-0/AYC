<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
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
            'parent_id' => $this->parent_id ? (string) $this->parent_id : null,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description ?: '',
            'image' => $this->image_url ?: '/categories/default.jpg',
            'image_url' => $this->image_url ?: '/categories/default.jpg',
            'accent_color' => $this->accent_color ?: '#4B5563',
            'sort_order' => (int) ($this->sort_order ?? 0),
            'is_active' => (bool) ($this->is_active ?? true),
            'is_featured_on_landing' => (bool) ($this->is_featured_on_landing ?? false),
            'landing_sort_order' => (int) ($this->landing_sort_order ?? 0),
            'products_count' => $this->whenCounted('products'),
            'children' => CategoryResource::collection($this->whenLoaded('children')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
