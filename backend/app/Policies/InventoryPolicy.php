<?php

namespace App\Policies;

use App\Models\Inventory;
use App\Models\User;

class InventoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function view(User $user, Inventory $inventory): bool
    {
        return $user->isAdmin();
    }

    public function adjust(User $user): bool
    {
        return $user->isAdmin();
    }
}
