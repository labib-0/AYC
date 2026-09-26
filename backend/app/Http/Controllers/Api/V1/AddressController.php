<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\Address;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AddressController extends ApiController
{
    /**
     * GET /api/v1/addresses
     */
    public function index(Request $request): JsonResponse
    {
        $addresses = $request->user()->addresses()->orderBy('is_default', 'desc')->get();
        return $this->success($addresses, 'Addresses retrieved');
    }

    /**
     * POST /api/v1/addresses
     */
    public function store(Request $request): JsonResponse
    {
        if ($request->has('address_line1') && !$request->has('address_line_1')) {
            $request->merge(['address_line_1' => $request->input('address_line1')]);
        }
        if ($request->has('address_line2') && !$request->has('address_line_2')) {
            $request->merge(['address_line_2' => $request->input('address_line2')]);
        }

        $validated = $request->validate([
            'type' => ['nullable', 'string', 'in:shipping,billing'],
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address_line_1' => ['required', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['required', 'string', 'max:30'],
            'country_code' => ['nullable', 'string', 'max:10'],
            'is_default' => ['nullable', 'boolean'],
        ]);

        if (!empty($validated['is_default'])) {
            $request->user()->addresses()->update(['is_default' => false]);
        }

        $address = $request->user()->addresses()->create($validated);

        return $this->success($address, 'Address created successfully', 201);
    }

    /**
     * PUT /api/v1/addresses/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $address = $request->user()->addresses()->findOrFail($id);

        $validated = $request->validate([
            'type' => ['sometimes', 'string', 'in:shipping,billing'],
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address_line_1' => ['sometimes', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'city' => ['sometimes', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['sometimes', 'string', 'max:30'],
            'country_code' => ['sometimes', 'string', 'max:10'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        if (!empty($validated['is_default'])) {
            $request->user()->addresses()->where('id', '!=', $id)->update(['is_default' => false]);
        }

        $address->update($validated);

        return $this->success($address, 'Address updated successfully');
    }

    /**
     * DELETE /api/v1/addresses/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $address = $request->user()->addresses()->findOrFail($id);
        $address->delete();

        return $this->success(null, 'Address deleted successfully');
    }
}
