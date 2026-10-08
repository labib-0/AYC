<?php

namespace App\Http\Requests\Wishlist;

use Illuminate\Foundation\Http\FormRequest;

class AddSelectedWishlistItemsToCartRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'wishlist_item_ids' => ['sometimes', 'array'],
            'wishlist_item_ids.*' => ['nullable'],
            'item_ids' => ['sometimes', 'array'],
            'item_ids.*' => ['nullable'],
            'product_ids' => ['sometimes', 'array'],
            'product_ids.*' => ['nullable'],
            'items' => ['sometimes', 'array'],
            'items.*.wishlist_item_id' => ['nullable'],
            'items.*.product_id' => ['nullable'],
            'items.*.quantity' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
