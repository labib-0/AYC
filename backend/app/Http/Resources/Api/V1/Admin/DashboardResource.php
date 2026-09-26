<?php

namespace App\Http\Resources\Api\V1\Admin;

use Illuminate\Http\Resources\Json\JsonResource;

class DashboardResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray($request): array
    {
        return [
            'total_products' => (int) ($this['total_products'] ?? 0),
            'active_products' => (int) ($this['active_products'] ?? 0),
            'total_customers' => (int) ($this['total_customers'] ?? 0),
            'total_orders' => (int) ($this['total_orders'] ?? 0),
            'pending_orders' => (int) ($this['pending_orders'] ?? 0),
            'processing_orders' => (int) ($this['processing_orders'] ?? 0),
            'delivered_orders' => (int) ($this['delivered_orders'] ?? 0),
            'revenue' => (float) ($this['revenue'] ?? 0.0),
            'low_stock_items' => (int) ($this['low_stock_items'] ?? 0),
            'recent_orders' => $this['recent_orders'] ?? [],
            'recent_rfqs' => $this['recent_rfqs'] ?? [],
        ];
    }
}
?>
