<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('shipping_method', 100)->nullable()->after('shipping_country_code');
            $table->string('carrier', 100)->nullable()->after('shipping_method');
            $table->string('tracking_number', 100)->nullable()->after('carrier');
            $table->string('shipment_id', 100)->nullable()->after('tracking_number');
            $table->string('shipment_reference', 100)->nullable()->after('shipment_id');
            $table->string('shipment_label_url', 500)->nullable()->after('shipment_reference');
            $table->string('carrier_status', 100)->nullable()->after('shipment_label_url');
            $table->timestamp('last_carrier_update')->nullable()->after('carrier_status');
            $table->text('last_shipment_error')->nullable()->after('last_carrier_update');
            $table->string('shipping_quote_id', 100)->nullable()->after('last_shipment_error');
            $table->json('shipping_snapshot')->nullable()->after('shipping_quote_id');
            $table->decimal('other_charges', 12, 2)->default(0.00)->after('tax_amount');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'shipping_method',
                'carrier',
                'tracking_number',
                'shipment_id',
                'shipment_reference',
                'shipment_label_url',
                'carrier_status',
                'last_carrier_update',
                'last_shipment_error',
                'shipping_quote_id',
                'shipping_snapshot',
                'other_charges',
            ]);
        });
    }
};
