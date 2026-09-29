<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventories', function (Blueprint $table) {
            if (Schema::hasColumn('inventories', 'reserved_quantity')) {
                $table->dropColumn('reserved_quantity');
            }
        });
    }

    public function down(): void
    {
        Schema::table('inventories', function (Blueprint $table) {
            if (!Schema::hasColumn('inventories', 'reserved_quantity')) {
                $table->integer('reserved_quantity')->default(0);
            }
        });
    }
};
