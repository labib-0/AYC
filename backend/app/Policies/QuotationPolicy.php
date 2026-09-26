<?php

namespace App\Policies;

use App\Models\Quotation;
use App\Models\User;

class QuotationPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Quotation $quotation): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return (int) $quotation->user_id === (int) $user->id 
            || strtolower($quotation->buyer_email) === strtolower($user->email);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, Quotation $quotation): bool
    {
        return $user->isAdmin();
    }

    public function respond(User $user, Quotation $quotation): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return (int) $quotation->user_id === (int) $user->id 
            || strtolower($quotation->buyer_email) === strtolower($user->email);
    }

    public function delete(User $user, Quotation $quotation): bool
    {
        return $user->isAdmin();
    }
}
