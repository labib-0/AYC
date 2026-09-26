<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\Api\V1\QuotationResource;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Quote;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\User;
use App\Jobs\GenerateCommercialDocumentJob;
use App\Notifications\QuotationCreatedNotification;
use App\Notifications\QuotationStatusNotification;
use App\Services\Audit\ActivityLogger;
use App\Services\Documents\OfferSheetService;
use App\Services\Documents\ProformaInvoiceService;
use App\Services\Rbac\AdminAuthorizationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuotationController extends ApiController
{
    public function __construct(
        private readonly AdminAuthorizationService $authorization
    ) {}
    /**
     * GET /api/v1/quotations
     * List quotations with customer ownership isolation and admin filtering.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user() ?: auth('sanctum')->user();
        if (!$user) {
            return $this->unauthorized('Authentication required to view quotations');
        }

        $query = Quotation::with(['items', 'quote']);

        // Customer Access Isolation: customers only see their own quotations
        if (!$user->isAdmin()) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('buyer_email', $user->email);
            });
        }

        // Status Filter
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', strtoupper($request->input('status')));
        }

        // Search Query
        if ($request->filled('search') || $request->filled('q')) {
            $search = trim($request->input('search', $request->input('q')));
            $query->where(function ($q) use ($search) {
                $q->where('quotation_number', 'like', "%{$search}%")
                  ->orWhere('buyer_name', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('buyer_email', 'like', "%{$search}%")
                  ->orWhere('destination_country', 'like', "%{$search}%");
            });
        }

        // Date Range Filters
        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->input('from_date'));
        }
        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->input('to_date'));
        }

        $quotations = $query->orderBy('created_at', 'desc')->get();

        return $this->success(QuotationResource::collection($quotations), 'Quotations retrieved successfully');
    }

    /**
     * GET /api/v1/quotations/{id}
     * Retrieve single quotation details.
     */
    public function show(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user() ?: auth('sanctum')->user();
        if (!$user) {
            return $this->unauthorized('Authentication required');
        }

        $query = Quotation::with(['items', 'quote.items', 'creator', 'user']);
        $quotation = is_numeric($id) ? $query->find((int) $id) : $query->where('quotation_number', $id)->first();

        if (!$quotation) {
            return $this->notFound('Quotation not found');
        }

        // Authorization check
        if (!$user->isAdmin()) {
            $isOwner = ((int) $quotation->user_id === (int) $user->id) ||
                       (strtolower($quotation->buyer_email) === strtolower($user->email));
            if (!$isOwner) {
                return $this->forbidden('You are not authorized to view this quotation');
            }
        }

        return $this->success(new QuotationResource($quotation), 'Quotation details retrieved');
    }

    /**
     * POST /api/v1/admin/quotations (or /api/v1/quotations for admin)
     * Admin creates formal commercial quotation linked to RFQ using Phase 3 wholesale pricing.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user() ?: auth('sanctum')->user();
        if (!$user || !$user->isAdmin()) {
            return $this->forbidden('Only administrators can issue formal commercial quotations');
        }

        $validated = $request->validate([
            'rfq_id' => ['nullable'],
            'user_id' => ['nullable', 'exists:users,id'],
            'buyer_name' => ['required', 'string', 'max:255'],
            'buyer_email' => ['required', 'email'],
            'buyer_phone' => ['nullable', 'string', 'max:50'],
            'company_name' => ['required', 'string', 'max:255'],
            'destination_country' => ['nullable', 'string'],
            'destination_city' => ['nullable', 'string'],
            'destination_port' => ['nullable', 'string'],
            'shipping_terms' => ['nullable', 'string'],
            'payment_terms' => ['nullable', 'string'],
            'incoterm' => ['nullable', 'string'],
            'delivery_estimate' => ['nullable', 'string'],
            'valid_until' => ['nullable', 'date'],
            'admin_notes' => ['nullable', 'string'],
            'customer_notes' => ['nullable', 'string'],
            'shipping_fee' => ['nullable', 'numeric', 'min:0'],
            'discount_total' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['nullable', 'exists:products,id'],
            'items.*.product_variant_id' => ['nullable', 'exists:product_variants,id'],
            'items.*.product_name' => ['required', 'string'],
            'items.*.sku' => ['nullable', 'string'],
            'items.*.selected_size' => ['nullable', 'string'],
            'items.*.selected_color' => ['nullable', 'string'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.discount_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $rfq = null;
        if (!empty($validated['rfq_id'])) {
            $rfq = is_numeric($validated['rfq_id'])
                ? Quote::find((int) $validated['rfq_id'])
                : Quote::where('rfq_number', $validated['rfq_id'])->first();
        }

        // Authoritative resolution of items and Phase 3 wholesale pricing tier
        $subtotal = 0.0;
        $processedItems = [];

        foreach ($validated['items'] as $itemData) {
            $productId = $itemData['product_id'] ?? null;
            $product = !empty($productId)
                ? (is_numeric($productId)
                    ? Product::find((int) $productId)
                    : Product::where('slug', $productId)->orWhere('sku', $productId)->first())
                : null;
            $unitPrice = null;
            $quantity = (int) ($itemData['quantity'] ?? 1);

            // If unit price specified by admin, honor it; otherwise resolve authoritative wholesale tier
            if (isset($itemData['unit_price']) && is_numeric($itemData['unit_price'])) {
                $unitPrice = (float) $itemData['unit_price'];
            } elseif ($product) {
                $unitPrice = $product->getUnitPriceForQuantity($quantity);
            } else {
                $unitPrice = 0.0;
            }

            $discount = isset($itemData['discount_amount']) ? (float) $itemData['discount_amount'] : 0.0;
            $lineTotal = round(($unitPrice * $quantity) - $discount, 2);
            $subtotal += $lineTotal;

            $processedItems[] = [
                'product_id' => $product?->id,
                'product_variant_id' => $itemData['product_variant_id'] ?? null,
                'product_name' => $itemData['product_name'] ?: ($product?->name ?? 'Export Item'),
                'product_slug' => $product?->slug,
                'sku' => $itemData['sku'] ?? $product?->sku,
                'selected_size' => $itemData['selected_size'] ?? null,
                'selected_color' => $itemData['selected_color'] ?? null,
                'product_image_url' => $product?->primary_image_url ?: '/placeholder.jpg',
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'discount_amount' => $discount,
                'line_total' => $lineTotal,
                'package_breakdown' => $itemData['package_breakdown'] ?? null,
            ];
        }

        $discountTotal = isset($validated['discount_total']) ? (float) $validated['discount_total'] : 0.0;
        $shippingFee = isset($validated['shipping_fee']) ? (float) $validated['shipping_fee'] : 0.0;
        $taxAmount = 0.0; // Export orders have 0% local VAT
        $grandTotal = max(0.0, round($subtotal - $discountTotal + $shippingFee + $taxAmount, 2));

        $year = date('Y');
        $randSuffix = str_pad((string) mt_rand(100000, 999999), 6, '0', STR_PAD_LEFT);
        $quotationNumber = "QT-AYN-{$year}-{$randSuffix}";

        $quotation = DB::transaction(function () use (
            $validated,
            $user,
            $rfq,
            $quotationNumber,
            $subtotal,
            $discountTotal,
            $shippingFee,
            $taxAmount,
            $grandTotal,
            $processedItems
        ) {
            $quoteRecord = Quotation::create([
                'quotation_number' => $quotationNumber,
                'revision_number' => 1,
                'quote_id' => $rfq?->id,
                'user_id' => $validated['user_id'] ?? $rfq?->user_id,
                'created_by' => $user->id,
                'buyer_name' => $validated['buyer_name'],
                'buyer_email' => $validated['buyer_email'],
                'buyer_phone' => $validated['buyer_phone'] ?? null,
                'company_name' => $validated['company_name'],
                'destination_country' => $validated['destination_country'] ?? ($rfq?->destination_country ?? 'United States'),
                'destination_city' => $validated['destination_city'] ?? $rfq?->destination_city,
                'destination_port' => $validated['destination_port'] ?? $rfq?->shipping_port,
                'currency' => 'USD',
                'currency_symbol' => '$',
                'subtotal' => $subtotal,
                'discount_total' => $discountTotal,
                'shipping_fee' => $shippingFee,
                'tax_amount' => $taxAmount,
                'grand_total' => $grandTotal,
                'payment_terms' => $validated['payment_terms'] ?? '30% T/T Advance, 70% against B/L',
                'shipping_terms' => $validated['shipping_terms'] ?? 'FOB Dhaka (Export)',
                'incoterm' => $validated['incoterm'] ?? 'FOB',
                'delivery_estimate' => $validated['delivery_estimate'] ?? '21–30 Days from Confirmed Payment',
                'valid_until' => !empty($validated['valid_until']) ? Carbon::parse($validated['valid_until']) : Carbon::now()->addDays(30),
                'admin_notes' => $validated['admin_notes'] ?? null,
                'customer_notes' => $validated['customer_notes'] ?? null,
                'status' => 'READY',
            ]);

            foreach ($processedItems as $item) {
                QuotationItem::create(array_merge($item, ['quotation_id' => $quoteRecord->id]));
            }

            if ($rfq) {
                $rfq->update(['status' => 'QUOTATION_PREPARED']);
            }

            return $quoteRecord;
        });

        // Dispatch Customer Notification
        $customerUser = $quotation->user_id ? User::find($quotation->user_id) : User::where('email', $quotation->buyer_email)->first();
        if ($customerUser) {
            $customerUser->notify(new QuotationCreatedNotification($quotation));
        }

        ActivityLogger::log('quotation.created', $quotation, [
            'quotation_number' => $quotation->quotation_number,
            'rfq_id' => $quotation->rfq_id,
            'grand_total' => $quotation->grand_total,
            'currency' => $quotation->currency,
        ]);

        return $this->success(new QuotationResource($quotation->load(['items', 'quote'])), 'Quotation created successfully', 201);
    }

    /**
     * POST /api/v1/quotations/{id}/respond
     * Customer responds to official quotation (accept, reject, request_changes).
     */
    public function respond(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user() ?: auth('sanctum')->user();
        if (!$user) {
            return $this->unauthorized('Authentication required to respond to quotation');
        }

        $query = Quotation::query();
        $quotation = is_numeric($id) ? $query->find((int) $id) : $query->where('quotation_number', $id)->first();

        if (!$quotation) {
            return $this->notFound('Quotation not found');
        }

        // Ownership enforcement: only owner customer or admin can respond
        if (!$user->isAdmin()) {
            $isOwner = ((int) $quotation->user_id === (int) $user->id) ||
                       (strtolower($quotation->buyer_email) === strtolower($user->email));
            if (!$isOwner) {
                return $this->forbidden('You are not authorized to respond to this quotation');
            }
        }

        $validated = $request->validate([
            'response' => ['required', 'string', 'in:accept,reject,request_changes'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $action = $validated['response'];
        $notes = $validated['notes'] ?? null;

        if ($user->isAdmin()) {
            if ($action === 'accept' && !$this->authorization->can($user, 'quotation.accept')) {
                return $this->forbidden("Forbidden: you do not have the 'quotation.accept' permission to accept quotations.");
            }
            if ($action === 'reject' && !$this->authorization->can($user, 'quotation.reject')) {
                return $this->forbidden("Forbidden: you do not have the 'quotation.reject' permission to reject quotations.");
            }
            if ($action === 'request_changes' && !$this->authorization->can($user, 'quotation.update_status')) {
                return $this->forbidden("Forbidden: you do not have the 'quotation.update_status' permission.");
            }
        }

        DB::transaction(function () use ($quotation, $action, $notes, $user) {
            $year = date('Y');
            $rand = str_pad((string) mt_rand(100000, 999999), 6, '0', STR_PAD_LEFT);

            if ($action === 'accept') {
                $quotation->status = 'ACCEPTED';
                $quotation->proforma_invoice_id = "PI-AYN-{$year}-{$rand}";
                $quotation->save();

                if ($quotation->quote) {
                    $quotation->quote->update(['status' => 'ACCEPTED']);
                }
            } elseif ($action === 'reject') {
                $quotation->status = 'REJECTED';
                $quotation->rejection_reason = $notes ?: 'Buyer rejected quotation terms';
                $quotation->save();

                if ($quotation->quote) {
                    $quotation->quote->update(['status' => 'REJECTED']);
                }
            } elseif ($action === 'request_changes') {
                $quotation->status = 'NEGOTIATION';
                $quotation->admin_notes = ($quotation->admin_notes ? $quotation->admin_notes . "\n" : '') . "Buyer requested changes: " . $notes;
                $quotation->save();

                if ($quotation->quote) {
                    $quotation->quote->update(['status' => 'NEGOTIATION']);
                }
            }
        });

        // Notify Admins
        $admins = User::where('role', 'admin')->get();
        if ($admins->isNotEmpty()) {
            \Illuminate\Support\Facades\Notification::send($admins, new QuotationStatusNotification($quotation, $action, $notes));
        }

        ActivityLogger::log('quotation.status_changed', $quotation, [
            'quotation_number' => $quotation->quotation_number,
            'response' => $action,
            'new_status' => $quotation->status,
            'notes' => $notes,
        ]);

        return $this->success(new QuotationResource($quotation->fresh()->load('items')), "Quotation {$action} processed successfully");
    }

    /**
     * GET /api/v1/quotations/{id}/documents/{docType}
     * Generate commercial document (OFFER_SHEET, QUOTATION, PROFORMA_INVOICE) for a quotation.
     */
    public function document(
        Request $request,
        int|string $id,
        string $docType,
        OfferSheetService $offerSheetService,
        ProformaInvoiceService $piService
    ): JsonResponse {
        $user = $request->user() ?: auth('sanctum')->user();
        if (!$user) {
            return $this->unauthorized('Authentication required to view quotation documents');
        }

        $query = Quotation::with(['items', 'quote']);
        $quotation = is_numeric($id) ? $query->find((int) $id) : $query->where('quotation_number', $id)->first();

        if (!$quotation) {
            return $this->notFound('Quotation not found');
        }

        if (!$user->isAdmin()) {
            $isOwner = ((int) $quotation->user_id === (int) $user->id) ||
                       (strtolower($quotation->buyer_email) === strtolower($user->email));
            if (!$isOwner) {
                return $this->forbidden('You are not authorized to view commercial documents for this quotation');
            }
        } else {
            if (!$this->authorization->can($user, 'document.view')) {
                return $this->forbidden("Forbidden: you do not have the 'document.view' permission to view commercial documents.");
            }
        }

        $normalizedType = strtoupper(trim($docType));

        $payload = match ($normalizedType) {
            'PROFORMA_INVOICE' => $piService->generateForQuotation($quotation),
            'OFFER_SHEET', 'QUOTATION' => $offerSheetService->generateForQuotation($quotation),
            default => $offerSheetService->generateForQuotation($quotation),
        };

        return $this->success($payload, "Commercial document '{$docType}' generated successfully");
    }

    /**
     * POST /api/v1/admin/quotations/{id}/generate-document-async
     * Dispatches queued background job to generate and store document asynchronously.
     */
    public function generateDocumentAsync(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user() ?: auth('sanctum')->user();
        if ($user && $user->isAdmin() && !$this->authorization->can($user, 'document.generate')) {
            return $this->forbidden("Forbidden: you do not have the 'document.generate' permission.");
        }

        $quotation = is_numeric($id) ? Quotation::find((int) $id) : Quotation::where('quotation_number', $id)->first();
        if (!$quotation) {
            return $this->notFound('Quotation not found');
        }

        $validated = $request->validate([
            'document_type' => ['required', 'string', 'in:offer-sheet,proforma-invoice,commercial-invoice,offer_sheet,proforma_invoice,commercial_invoice'],
        ]);

        GenerateCommercialDocumentJob::dispatch($quotation->id, $validated['document_type']);

        ActivityLogger::log('document.queued_generation', $quotation, [
            'quotation_number' => $quotation->quotation_number,
            'document_type' => $validated['document_type'],
        ]);

        return $this->success([
            'quotation_id' => $quotation->id,
            'quotation_number' => $quotation->quotation_number,
            'document_type' => $validated['document_type'],
            'status' => 'queued',
        ], 'Commercial document generation queued successfully');
    }
}
