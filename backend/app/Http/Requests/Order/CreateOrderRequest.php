<?php

namespace App\Http\Requests\Order;

use Illuminate\Foundation\Http\FormRequest;

class CreateOrderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare data for validation.
     */
    protected function prepareForValidation(): void
    {
        $merge = [];
        $user = $this->user() ?? auth('sanctum')->user();
        if (!$this->has('email') && $user) {
            $merge['email'] = $user->email;
        }

        // Map camelCase fields from frontend payloads to standard snake_case
        if ($this->has('shippingName') && !$this->has('shipping_name')) {
            $merge['shipping_name'] = $this->input('shippingName');
        }
        if ($this->has('shippingPhone') && !$this->has('shipping_phone')) {
            $merge['shipping_phone'] = $this->input('shippingPhone');
        }
        if ($this->has('shippingAddress') && !$this->has('shipping_address1')) {
            $merge['shipping_address1'] = $this->input('shippingAddress');
        }
        if ($this->has('shippingAddress1') && !$this->has('shipping_address1')) {
            $merge['shipping_address1'] = $this->input('shippingAddress1');
        }
        if ($this->has('shippingAddress2') && !$this->has('shipping_address2')) {
            $merge['shipping_address2'] = $this->input('shippingAddress2');
        }
        if ($this->has('shippingCity') && !$this->has('shipping_city')) {
            $merge['shipping_city'] = $this->input('shippingCity');
        }
        if ($this->has('shippingRegion') && !$this->has('shipping_region')) {
            $merge['shipping_region'] = $this->input('shippingRegion');
        }
        if ($this->has('shippingPostalCode') && !$this->has('shipping_postal_code')) {
            $merge['shipping_postal_code'] = $this->input('shippingPostalCode');
        }
        if ($this->has('shippingCountryCode') && !$this->has('shipping_country_code')) {
            $merge['shipping_country_code'] = $this->input('shippingCountryCode');
        }
        if ($this->has('paymentMethod') && !$this->has('payment_method')) {
            $merge['payment_method'] = $this->input('paymentMethod');
        }
        if ($this->has('shippingMethod') && !$this->has('shipping_method')) {
            $merge['shipping_method'] = $this->input('shippingMethod');
        }
        if ($this->has('shippingCost') && !$this->has('shipping_cost')) {
            $merge['shipping_cost'] = $this->input('shippingCost');
        }
        if ($this->has('couponCode') && !$this->has('coupon_code')) {
            $merge['coupon_code'] = $this->input('couponCode');
        }
        if ($this->has('promoCode') && !$this->has('coupon_code')) {
            $merge['coupon_code'] = $this->input('promoCode');
        }
        if ($this->has('discountAmount') && !$this->has('discount_amount')) {
            $merge['discount_amount'] = $this->input('discountAmount');
        }

        if (!empty($merge)) {
            $this->merge($merge);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255'],
            'shipping_name' => ['required', 'string', 'max:255'],
            'shipping_phone' => ['nullable', 'string', 'max:50'],
            'shipping_address1' => ['required', 'string', 'max:255'],
            'shipping_address2' => ['nullable', 'string', 'max:255'],
            'shipping_city' => ['required', 'string', 'max:100'],
            'shipping_region' => ['nullable', 'string', 'max:100'],
            'shipping_postal_code' => ['required', 'string', 'max:30'],
            'shipping_country_code' => ['nullable', 'string', 'max:10'],
            'payment_method' => ['nullable', 'string', 'in:card,transfer,bank_transfer,proforma_invoice,cod,net_30,net_60,terms,invoice'],

            'shipping_method' => ['nullable', 'string', 'max:100'],
            'carrier' => ['nullable', 'string', 'max:100'],
            'shipping_cost' => ['nullable', 'numeric', 'min:0'],
            'shipping_quote_id' => ['nullable', 'string', 'max:100'],
            'shipping_snapshot' => ['nullable', 'array'],
            'other_charges' => ['nullable', 'numeric', 'min:0'],

            'notes' => ['nullable', 'string', 'max:1000'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'items' => ['nullable', 'array'],
            'items.*.product_id' => ['nullable'],
            'items.*.variant_id' => ['nullable'],
            'items.*.size' => ['nullable', 'string'],
            'items.*.quantity' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $method = strtoupper((string) ($this->input('shipping_method') ?? ''));
            $carrier = strtoupper((string) ($this->input('carrier') ?? ''));
            if ((str_contains($method, 'ARAMEX') || str_contains($carrier, 'ARAMEX')) && !\App\Models\SystemSetting::isAramexEnabled()) {
                $validator->errors()->add(
                    'shipping_method',
                    'Aramex Priority Air Express is currently unavailable. Please select Discuss Directly to proceed.'
                );
            }
        });
    }
}
