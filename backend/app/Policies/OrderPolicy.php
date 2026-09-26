<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    /**
     * Determine whether the user can view list of orders.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the order.
     */
    public function view(User $user, Order $order): bool
    {
        return $user->isAdmin() || $order->user_id === $user->id;
    }

    /**
     * Determine whether the user can create an order.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the order.
     */
    public function update(User $user, Order $order): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can cancel the order.
     */
    public function cancel(User $user, Order $order): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $order->user_id === $user->id && in_array($order->status, ['pending', 'payment_pending']);
    }

    /**
     * Determine whether the user can review payment proof.
     */
    public function reviewPaymentProof(User $user, Order $order): bool
    {
        return $user->isAdmin();
    }
}
