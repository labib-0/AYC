<?php

require_once __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Order;
use App\Models\AdminInventoryAdjustment;
use App\Models\User;

$orders = Order::where('order_source', 'pos')->latest()->take(2)->with(['items', 'payments'])->get();

$audit = [];
foreach ($orders as $idx => $o) {
    $adjustments = AdminInventoryAdjustment::where('reason', 'like', "%{$o->order_number}%")->get();
    $audit["order_" . ($idx + 1)] = [
        'order_number' => $o->order_number,
        'status' => $o->status,
        'payment_status' => $o->payment_status,
        'order_source' => $o->order_source,
        'total_amount' => (float) $o->total_amount,
        'paid_amount' => (float) $o->paid_amount,
        'tendered_amount' => (float) ($o->payment_details['tendered_amount'] ?? 0),
        'change_return' => (float) ($o->payment_details['change_return'] ?? 0),
        'payments' => $o->payments->map(fn($p) => [
            'method' => $p->payment_method,
            'amount' => (float) $p->amount,
            'status' => $p->status,
            'transaction_id' => $p->transaction_id,
        ])->all(),
        'items' => $o->items->map(fn($i) => [
            'sku' => $i->sku,
            'name' => $i->product_name,
            'size' => $i->size,
            'qty' => $i->quantity,
            'unit_price' => (float) $i->unit_price,
            'line_total' => (float) $i->line_total,
            'buying_price_at_sale' => $i->buying_price_at_sale,
        ])->all(),
        'adjustments_count' => $adjustments->count(),
        'adjustments' => $adjustments->map(fn($a) => [
            'inventory_id' => $a->inventory_id,
            'previous_qty' => $a->previous_quantity,
            'adjustment' => $a->adjustment_amount,
            'resulting_qty' => $a->resulting_quantity,
            'reason' => $a->reason,
        ])->all(),
    ];
}

// Check quick added user
$quickUser = User::where('name', 'Farhan Ahmed')->latest()->first();
$security = [
    'quick_user_found' => (bool) $quickUser,
    'user_id' => $quickUser?->id,
    'name' => $quickUser?->name,
    'email' => $quickUser?->email,
    'phone' => $quickUser?->phone,
    'company_name' => $quickUser?->company_name,
    'email_verified' => $quickUser?->email_verified_at !== null,
    'is_synthetic' => $quickUser?->isSyntheticEmail(),
    'mail_suppressed' => $quickUser?->routeNotificationForMail() === null,
];

echo json_encode(['orders' => $audit, 'security' => $security], JSON_PRETTY_PRINT);
