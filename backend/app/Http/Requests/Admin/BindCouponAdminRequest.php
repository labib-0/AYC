<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class BindCouponAdminRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'coupon_id'     => ['required', 'integer', 'exists:coupons,id'],
            'admin_user_id' => ['required', 'integer', 'exists:users,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'coupon_id.required'     => 'Please select a coupon to bind.',
            'coupon_id.exists'       => 'The selected coupon does not exist.',
            'admin_user_id.required' => 'Please select an administrator to bind.',
            'admin_user_id.exists'   => 'The selected administrator does not exist.',
        ];
    }
}
