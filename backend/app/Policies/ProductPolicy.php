<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    /**
     * Determine whether anyone can view the product catalog.
     */
    public function viewAny(?User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the specific product.
     */
    public function view(?User $user, Product $product): bool
    {
        if ($product->status === 'published') {
            return true;
        }

        return $user !== null && $user->isAdmin();
    }

    /**
     * Determine whether the user can view sensitive cost/buying price.
     */
    public function viewCostPrice(?User $user): bool
    {
        return $user !== null && $user->isAdmin();
    }

    /**
     * Determine whether the user can create products.
     */
    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can update the product.
     */
    public function update(User $user, Product $product): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can delete the product.
     */
    public function delete(User $user, Product $product): bool
    {
        return $user->isAdmin();
    }
}
