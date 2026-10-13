<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('supplier_name', 255)
                ->nullable()
                ->after('supplier_id');
            $table->index('supplier_name');
        });

        // Safely backfill existing supplier names from the relational suppliers table if any exist
        if (Schema::hasTable('suppliers') && Schema::hasColumn('products', 'supplier_id')) {
            $driver = DB::connection()->getDriverName();
            if ($driver === 'pgsql') {
                DB::statement("
                    UPDATE products p
                    SET supplier_name = s.name
                    FROM suppliers s
                    WHERE p.supplier_id = s.id
                      AND (p.supplier_name IS NULL OR p.supplier_name = '')
                ");
            } else {
                DB::statement("
                    UPDATE products p
                    INNER JOIN suppliers s ON p.supplier_id = s.id
                    SET p.supplier_name = s.name
                    WHERE p.supplier_name IS NULL OR p.supplier_name = ''
                ");
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['supplier_name']);
            $table->dropColumn('supplier_name');
        });
    }
};
