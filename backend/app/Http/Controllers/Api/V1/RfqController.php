<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\Api\V1\RfqMessageResource;
use App\Http\Resources\Api\V1\RfqResource;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\RfqMessage;
use App\Models\User;
use App\Notifications\RfqCreatedNotification;
use App\Notifications\RfqMessageNotification;
use App\Services\Audit\ActivityLogger;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class RfqController extends ApiController
{
    /**
     * GET /api/v1/rfq
     * List RFQs with date/time, status, and search filters.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user() ?: auth('sanctum')->user();
        if (!$user) {
            return $this->unauthorized('Authentication required to view RFQs');
        }

        $query = Quote::with(['items', 'messages', 'latestQuotation']);

        // Customer access isolation: Customers see only their own RFQs
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
                $q->where('rfq_number', 'like', "%{$search}%")
                  ->orWhere('buyer_name', 'like', "%{$search}%")
                  ->orWhere('buyer_email', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('destination_country', 'like', "%{$search}%");
            });
        }

        // Destination Country Filter
        if ($request->filled('country') && $request->input('country') !== 'all') {
            $query->where('destination_country', 'like', '%' . $request->input('country') . '%');
        }

        // SECTION 5: Admin Date/Time-based Filtering
        if ($request->filled('date_filter')) {
            $dateFilter = strtolower($request->input('date_filter'));
            match ($dateFilter) {
                'today' => $query->whereDate('created_at', Carbon::today()),
                'yesterday' => $query->whereDate('created_at', Carbon::yesterday()),
                'this_week' => $query->whereBetween('created_at', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()]),
                'this_month' => $query->whereBetween('created_at', [Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth()]),
                default => null,
            };
        }

        // Custom Date Range Filters
        $fromDate = $request->input('from_date', $request->input('from'));
        $toDate = $request->input('to_date', $request->input('to'));

        if ($fromDate) {
            $from = Carbon::parse($fromDate);
            if ($request->filled('from_time')) {
                $timeParts = explode(':', $request->input('from_time'));
                $from->setTime((int) ($timeParts[0] ?? 0), (int) ($timeParts[1] ?? 0));
                $query->where('created_at', '>=', $from);
            } else {
                $query->whereDate('created_at', '>=', $from->toDateString());
            }
        }

        if ($toDate) {
            $to = Carbon::parse($toDate);
            if ($request->filled('to_time')) {
                $timeParts = explode(':', $request->input('to_time'));
                $to->setTime((int) ($timeParts[0] ?? 23), (int) ($timeParts[1] ?? 59));
                $query->where('created_at', '<=', $to);
            } else {
                $query->whereDate('created_at', '<=', $to->toDateString());
            }
        }

        $rfqs = $query->orderBy('created_at', 'desc')->get();

        return $this->success(RfqResource::collection($rfqs), 'RFQs retrieved successfully');
    }

    /**
     * GET /api/v1/rfq/{id}
     * Retrieve single RFQ details with items, conversation, and latest quotation.
     */
    public function show(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user() ?: auth('sanctum')->user();
        if (!$user) {
            return $this->unauthorized('Authentication required to view RFQ details');
        }

        $query = Quote::with(['items.product.images', 'messages.user', 'latestQuotation', 'user']);

        if (is_numeric($id)) {
            $rfq = $query->where('id', (int) $id)->first();
        } else {
            $rfq = $query->where('rfq_number', $id)->first();
        }

        if (!$rfq) {
            return $this->notFound('RFQ record not found');
        }

        // Enforce Ownership Isolation
        if (!$user->isAdmin()) {
            $isOwner = ($rfq->user_id && (int) $rfq->user_id === (int) $user->id) ||
                       ($rfq->buyer_email && strtolower($rfq->buyer_email) === strtolower($user->email));
            if (!$isOwner) {
                return $this->forbidden('You are not authorized to view this RFQ');
            }
        }

        return $this->success(new RfqResource($rfq), 'RFQ details retrieved');
    }

    /**
     * POST /api/v1/rfq
     * Create new RFQ with items and initialize persistent conversation.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user() ?: auth('sanctum')->user();

        // Support both snake_case and camelCase payloads seamlessly
        $rawItems = $request->input('items', []);
        $formattedItems = [];

        if (is_array($rawItems)) {
            foreach ($rawItems as $item) {
                $formattedItems[] = [
                    'product_id' => $item['product_id'] ?? $item['productId'] ?? null,
                    'product_name' => $item['product_name'] ?? $item['productName'] ?? 'Requested Garment',
                    'product_slug' => $item['product_slug'] ?? $item['productSlug'] ?? null,
                    'brand' => $item['brand'] ?? 'Ayaan',
                    'sku' => $item['sku'] ?? null,
                    'image_url' => $item['image_url'] ?? $item['image'] ?? null,
                    'selected_color' => $item['selected_color'] ?? $item['selectedColor'] ?? null,
                    'selected_size' => $item['selected_size'] ?? $item['selectedSize'] ?? null,
                    'quantity' => (int) ($item['quantity'] ?? 1),
                    'moq' => (int) ($item['moq'] ?? 1),
                    'unit_price' => isset($item['unit_price']) ? (float) $item['unit_price'] : (isset($item['unitPrice']) ? (float) $item['unitPrice'] : null),
                    'target_price' => isset($item['target_price']) ? (float) $item['target_price'] : (isset($item['targetPrice']) ? (float) $item['targetPrice'] : null),
                    'buyer_notes' => $item['buyer_notes'] ?? $item['buyerNotes'] ?? null,
                ];
            }
        }

        $mergeData = [
            'buyer_name' => $request->input('buyer_name', $request->input('buyerName', $request->input('contact_name', $user?->name ?? ''))),
            'buyer_email' => $request->input('buyer_email', $request->input('buyerEmail', $request->input('contact_email', $user?->email ?? ''))),
            'buyer_phone' => $request->input('buyer_phone', $request->input('buyerPhone', $request->input('contact_phone', $user?->phone ?? null))),
            'company_name' => $request->input('company_name', $request->input('companyName', $user?->company_name ?? 'Individual Buyer')),
            'business_type' => $request->input('business_type', $request->input('businessType', 'Wholesale Buyer')),
            'website' => $request->input('website', null),
            'tax_number' => $request->input('tax_number', $request->input('taxNumber', $user?->tax_id ?? null)),
            'destination_country' => $request->input('destination_country', $request->input('destinationCountry', $request->input('country_code', 'United States'))),
            'destination_city' => $request->input('destination_city', $request->input('destinationCity', '')),
            'shipping_port' => $request->input('shipping_port', $request->input('shippingPort', null)),
            'target_delivery_date' => $request->input('target_delivery_date', $request->input('targetDeliveryDate', null)),
            'request_title' => $request->input('request_title', $request->input('requestTitle', null)),
            'general_notes' => $request->input('general_notes', $request->input('generalNotes', $request->input('notes', null))),
            'items' => $formattedItems,
        ];

        $request->merge($mergeData);

        $validated = $request->validate([
            'buyer_name' => ['required', 'string', 'max:255'],
            'buyer_email' => ['required', 'email'],
            'buyer_phone' => ['nullable', 'string', 'max:50'],
            'company_name' => ['required', 'string', 'max:255'],
            'business_type' => ['nullable', 'string'],
            'website' => ['nullable', 'string'],
            'tax_number' => ['nullable', 'string'],
            'destination_country' => ['nullable', 'string'],
            'destination_city' => ['nullable', 'string'],
            'shipping_port' => ['nullable', 'string'],
            'target_delivery_date' => ['nullable', 'string'],
            'request_title' => ['nullable', 'string'],
            'general_notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['nullable'],
            'items.*.product_name' => ['required', 'string'],
            'items.*.product_slug' => ['nullable', 'string'],
            'items.*.brand' => ['nullable', 'string'],
            'items.*.sku' => ['nullable', 'string'],
            'items.*.image_url' => ['nullable', 'string'],
            'items.*.selected_color' => ['nullable', 'string'],
            'items.*.selected_size' => ['nullable', 'string'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.moq' => ['nullable', 'integer'],
            'items.*.unit_price' => ['nullable', 'numeric'],
            'items.*.target_price' => ['nullable', 'numeric'],
            'items.*.buyer_notes' => ['nullable', 'string'],
        ]);

        $year = date('Y');
        $randSuffix = str_pad((string) mt_rand(100000, 999999), 6, '0', STR_PAD_LEFT);
        $rfqNumber = "RFQ-AYN-{$year}-{$randSuffix}";

        $rfq = DB::transaction(function () use ($validated, $user, $rfqNumber) {
            $quote = Quote::create([
                'rfq_number' => $rfqNumber,
                'user_id' => $user?->id,
                'buyer_name' => $validated['buyer_name'],
                'buyer_email' => $validated['buyer_email'],
                'buyer_phone' => $validated['buyer_phone'] ?? null,
                'company_name' => $validated['company_name'],
                'business_type' => $validated['business_type'] ?? 'Wholesaler',
                'website' => $validated['website'] ?? null,
                'tax_number' => $validated['tax_number'] ?? null,
                'destination_country' => $validated['destination_country'] ?? 'United States',
                'destination_city' => $validated['destination_city'] ?? null,
                'shipping_port' => $validated['shipping_port'] ?? null,
                'target_delivery_date' => $validated['target_delivery_date'] ?? null,
                'request_title' => $validated['request_title'] ?? "RFQ — " . count($validated['items']) . " Items",
                'general_notes' => $validated['general_notes'] ?? null,
                'status' => 'SUBMITTED',
            ]);

            foreach ($validated['items'] as $item) {
                QuoteItem::create([
                    'quote_id' => $quote->id,
                    'product_id' => $item['product_id'] ?? null,
                    'product_name' => $item['product_name'],
                    'product_slug' => $item['product_slug'] ?? null,
                    'brand' => $item['brand'] ?? 'Ayaan',
                    'sku' => $item['sku'] ?? null,
                    'image_url' => $item['image_url'] ?? null,
                    'selected_color' => $item['selected_color'] ?? null,
                    'selected_size' => $item['selected_size'] ?? null,
                    'quantity' => $item['quantity'],
                    'moq' => $item['moq'] ?? 1,
                    'unit_price' => $item['unit_price'] ?? null,
                    'target_price' => $item['target_price'] ?? null,
                    'buyer_notes' => $item['buyer_notes'] ?? null,
                ]);
            }

            // Persist initial message into persistent RFQ conversation if notes provided
            if (!empty($validated['general_notes'])) {
                RfqMessage::create([
                    'quote_id' => $quote->id,
                    'user_id' => $user?->id,
                    'sender_role' => 'customer',
                    'sender_name' => $validated['buyer_name'],
                    'message' => $validated['general_notes'],
                ]);
            }

            return $quote;
        });

        // Trigger Notification
        if ($user) {
            $user->notify(new RfqCreatedNotification($rfq));
        }

        return $this->success(new RfqResource($rfq->load(['items', 'messages'])), 'Quotation request submitted successfully', 201);
    }

    /**
     * PATCH /api/v1/rfq/{id}/status
     * Update RFQ status with transition validation.
     */
    public function updateStatus(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user() ?: auth('sanctum')->user();
        if (!$user) {
            return $this->unauthorized('Authentication required');
        }

        $query = Quote::query();
        $rfq = is_numeric($id) ? $query->find((int) $id) : $query->where('rfq_number', $id)->first();

        if (!$rfq) {
            return $this->notFound('RFQ not found');
        }

        if (!$user->isAdmin()) {
            $isOwner = ($rfq->user_id && (int) $rfq->user_id === (int) $user->id) ||
                       ($rfq->buyer_email && strtolower($rfq->buyer_email) === strtolower($user->email));
            if (!$isOwner) {
                return $this->forbidden('You are not authorized to update this RFQ');
            }
        }

        $validated = $request->validate([
            'status' => ['required', 'string'],
            'note' => ['nullable', 'string'],
        ]);

        $newStatus = strtoupper($validated['status']);
        $validStatuses = [
            'PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'NEED_INFORMATION', 'QUOTATION_PREPARED',
            'ISSUED', 'QUOTED', 'SENT_TO_BUYER', 'NEGOTIATION', 'ACCEPTED', 'REJECTED', 'EXPIRED',
            'CONVERTED_TO_ORDER', 'CANCELLED', 'CLOSED',
        ];

        if (!in_array($newStatus, $validStatuses)) {
            return $this->error("Invalid RFQ status '{$newStatus}'", 422);
        }

        // Customer Permission Constraint: Customers can only cancel, accept, or reject
        if (!$user->isAdmin() && !in_array($newStatus, ['CANCELLED', 'REJECTED', 'ACCEPTED', 'CLOSED'])) {
            return $this->forbidden("Customers cannot set administrative status '{$newStatus}'");
        }

        $rfq->update(['status' => $newStatus]);

        ActivityLogger::log('rfq.status_changed', $rfq, [
            'rfq_number' => $rfq->rfq_number,
            'new_status' => $newStatus,
            'note' => $validated['note'] ?? null,
        ]);

        if (!empty($validated['note'])) {
            RfqMessage::create([
                'quote_id' => $rfq->id,
                'user_id' => $user->id,
                'sender_role' => $user->isAdmin() ? 'admin' : 'customer',
                'sender_name' => $user->name,
                'message' => "Status changed to {$newStatus}. " . $validated['note'],
            ]);
        }

        return $this->success(new RfqResource($rfq->load(['items', 'messages'])), 'RFQ status updated successfully');
    }

    /**
     * GET /api/v1/rfq/{id}/messages
     * Retrieve persistent message thread for this RFQ.
     */
    public function getMessages(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user() ?: auth('sanctum')->user();
        if (!$user) {
            return $this->unauthorized('Authentication required to view messages');
        }

        $rfq = is_numeric($id) ? Quote::find((int) $id) : Quote::where('rfq_number', $id)->first();
        if (!$rfq) {
            return $this->notFound('RFQ not found');
        }

        if (!$user->isAdmin()) {
            $isOwner = ($rfq->user_id && (int) $rfq->user_id === (int) $user->id) ||
                       ($rfq->buyer_email && strtolower($rfq->buyer_email) === strtolower($user->email));
            if (!$isOwner) {
                return $this->forbidden('You are not authorized to view messages for this RFQ');
            }
        }

        $messages = $rfq->messages()->orderBy('created_at', 'asc')->get();

        return $this->success(RfqMessageResource::collection($messages), 'Messages retrieved');
    }

    /**
     * POST /api/v1/rfq/{id}/messages
     * Send a persistent message in the RFQ conversation thread.
     */
    public function addMessage(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user() ?: auth('sanctum')->user();
        if (!$user) {
            return $this->unauthorized('Authentication required to send messages');
        }

        $rfq = is_numeric($id) ? Quote::find((int) $id) : Quote::where('rfq_number', $id)->first();
        if (!$rfq) {
            return $this->notFound('RFQ not found');
        }

        if (!$user->isAdmin()) {
            $isOwner = ($rfq->user_id && (int) $rfq->user_id === (int) $user->id) ||
                       ($rfq->buyer_email && strtolower($rfq->buyer_email) === strtolower($user->email));
            if (!$isOwner) {
                return $this->forbidden('You are not authorized to post messages on this RFQ');
            }
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
            'sender_name' => ['nullable', 'string', 'max:255'],
        ]);

        $senderRole = $user->isAdmin() ? 'admin' : 'customer';
        $senderName = $validated['sender_name'] ?? $user->name ?? ($senderRole === 'admin' ? 'Export Desk' : 'Valued Buyer');

        $message = RfqMessage::create([
            'quote_id' => $rfq->id,
            'user_id' => $user->id,
            'sender_role' => $senderRole,
            'sender_name' => $senderName,
            'message' => $validated['message'],
        ]);

        // Send alert notification to the other party
        if ($user->isAdmin() && $rfq->user) {
            $rfq->user->notify(new RfqMessageNotification($message));
        } else {
            // If customer replied, notify export admins
            $admins = User::where('role', 'admin')->get();
            if ($admins->isNotEmpty()) {
                Notification::send($admins, new RfqMessageNotification($message));
            }
        }

        ActivityLogger::log('rfq.message_sent', $rfq, [
            'rfq_number' => $rfq->rfq_number,
            'sender_role' => $senderRole,
        ]);

        return $this->success(new RfqMessageResource($message), 'Message posted successfully', 201);
    }
}
