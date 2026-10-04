<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupplierController extends ApiController
{
    /**
     * GET /api/v1/admin/suppliers
     * Search and list suppliers for admin selector and management.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Supplier::query();

        if (!$request->boolean('include_inactive')) {
            $query->where('is_active', true);
        }

        $term = trim((string) ($request->input('q') ?? $request->input('search') ?? ''));
        if ($term !== '') {
            $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($term, $likeOp) {
                $q->where('name', $likeOp, "%{$term}%")
                  ->orWhere('code', $likeOp, "%{$term}%")
                  ->orWhere('contact_person', $likeOp, "%{$term}%");
            });
        }

        $limit = min(max((int) ($request->input('limit') ?? $request->input('per_page') ?? 30), 1), 100);
        $suppliers = $query->orderBy('name', 'asc')->paginate($limit);

        return $this->success($suppliers, 'Suppliers retrieved successfully');
    }

    /**
     * GET /api/v1/admin/suppliers/{id}
     * Get a single supplier by ID or code.
     */
    public function show(string $id): JsonResponse
    {
        $supplier = is_numeric($id)
            ? Supplier::find((int) $id)
            : Supplier::where('code', $id)->first();

        if (!$supplier) {
            return $this->error('Supplier not found', 404);
        }

        return $this->success($supplier, 'Supplier retrieved successfully');
    }

    /**
     * POST /api/v1/admin/suppliers
     * Create a new supplier (Admin-only).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:suppliers,code'],
            'name' => ['required', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $supplier = Supplier::create([
            'code' => strtoupper(trim($validated['code'])),
            'name' => trim($validated['name']),
            'is_active' => $validated['is_active'] ?? true,
            'contact_person' => isset($validated['contact_person']) ? trim($validated['contact_person']) : null,
            'email' => isset($validated['email']) ? strtolower(trim($validated['email'])) : null,
            'phone' => isset($validated['phone']) ? trim($validated['phone']) : null,
            'notes' => isset($validated['notes']) ? trim($validated['notes']) : null,
        ]);

        return $this->success($supplier, 'Supplier created successfully', 201);
    }
}
