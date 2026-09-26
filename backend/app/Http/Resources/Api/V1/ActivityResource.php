<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $canViewSensitive = true;
        if ($user && $user->isAdmin()) {
            $authorization = app(\App\Services\Rbac\AdminAuthorizationService::class);
            $canViewSensitive = $authorization->can($user, 'audit.view_sensitive');
        }

        return [
            'id' => $this->id,
            'action' => $this->action,
            'subject_type' => $this->subject_type ? class_basename($this->subject_type) : null,
            'subject_id' => $this->subject_id,
            'user' => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'role' => $this->user->role,
            ] : null,
            'metadata' => $this->metadata,
            'ip_address' => $canViewSensitive ? $this->ip_address : null,
            'user_agent' => $canViewSensitive ? $this->user_agent : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
