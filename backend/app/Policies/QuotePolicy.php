<?php

namespace App\Policies;

use App\Models\Quote;
use App\Models\User;

class QuotePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Quote $quote): bool
    {
        return $user->isAdmin() || $quote->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Quote $quote): bool
    {
        return $user->isAdmin();
    }
}
