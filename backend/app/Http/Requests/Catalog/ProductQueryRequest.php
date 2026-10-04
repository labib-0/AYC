<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;

class ProductQueryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare inputs for validation.
     */
    protected function prepareForValidation(): void
    {
        $booleans = ['is_featured', 'is_hot', 'is_new', 'is_best_deal', 'is_limited_deal', 'in_stock', 'isAdmin', 'all', 'is_preorder', 'is_sold_out'];
        $merge = [];
        foreach ($booleans as $field) {
            if ($this->has($field)) {
                $val = $this->input($field);
                $merge[$field] = filter_var($val, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? (bool) $val;
            }
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
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable'],
            'all' => ['nullable', 'boolean'],
            'search' => ['nullable', 'string', 'max:255'],
            'q' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:255'],
            'audience' => ['nullable', 'string', 'max:50'],
            'design_type' => ['nullable', 'string', 'max:100'],
            'designType' => ['nullable', 'string', 'max:100'],
            'price_min' => ['nullable', 'numeric', 'min:0'],
            'price_max' => ['nullable', 'numeric', 'min:0'],
            'color' => ['nullable', 'string', 'max:100'],
            'size' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', 'string', 'in:all,published,draft,archived'],
            'is_featured' => ['nullable', 'boolean'],
            'is_hot' => ['nullable', 'boolean'],
            'is_new' => ['nullable', 'boolean'],
            'is_best_deal' => ['nullable', 'boolean'],
            'is_limited_deal' => ['nullable', 'boolean'],
            'is_preorder' => ['nullable', 'boolean'],
            'is_sold_out' => ['nullable', 'boolean'],
            'availability' => ['nullable', 'string', 'in:ready_stock,preorder,sold_out,all'],
            'in_stock' => ['nullable', 'boolean'],
            'sort' => ['nullable', 'string', 'in:price_asc,price_desc,newest,popular,hot,featured,name_asc,name_desc'],
            'sort_by' => ['nullable', 'string', 'in:price_asc,price_desc,newest,popular,hot,featured,name_asc,name_desc'],
            'isAdmin' => ['nullable', 'boolean'],
            'exclude' => ['nullable', 'string', 'max:255'],
        ];
    }
}
