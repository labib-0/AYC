<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * RBAC Foundation — Phase 1
 *
 * Creates:
 *   roles                 — reusable permission bundles
 *   permissions           — atomic authorization units
 *   permission_dependencies — dependency graph (publish → draft → view)
 *   role_permissions      — many-to-many role ↔ permission
 *   admin_roles           — many-to-many admin user ↔ role
 *
 * Also adds users.is_super_admin boolean column.
 *
 * The existing users.access_level column is left in place for backward
 * compatibility; it is superseded by this normalized RBAC system.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Super Admin flag on users ────────────────────────────────────
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'is_super_admin')) {
                $table->boolean('is_super_admin')
                    ->default(false)
                    ->after('access_level')
                    ->index()
                    ->comment('True = unrestricted administrative authority. Exactly one authoritative super admin.');
            }
        });

        // ── 2. roles ─────────────────────────────────────────────────────────
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->comment('Human-readable label, e.g. Product Publisher');
            $table->string('slug', 100)->unique()->comment('Machine-readable, e.g. product_publisher');
            $table->string('description', 500)->nullable();
            $table->boolean('is_system')->default(false)
                ->comment('System roles cannot be deleted; only Super Admin can modify them');
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->index(['is_active', 'is_system']);
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
        });

        // ── 3. permissions ───────────────────────────────────────────────────
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150)->comment('Human-readable, e.g. Publish Product');
            $table->string('slug', 150)->unique()
                ->comment('Stable machine-readable key, e.g. product.publish. Never rename after deploy.');
            $table->string('description', 500)->nullable();
            $table->string('module', 80)->comment('Domain group, e.g. Catalog, Orders, Payment');
            $table->string('action', 80)->comment('Action verb, e.g. publish, view, delete');
            $table->boolean('is_system')->default(true)
                ->comment('System permissions cannot be deleted or renamed after deploy');
            $table->timestamps();

            $table->index(['module', 'action']);
            $table->index('slug');
        });

        // ── 4. permission_dependencies ───────────────────────────────────────
        Schema::create('permission_dependencies', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('permission_id')
                ->comment('The permission that has a prerequisite');
            $table->unsignedBigInteger('requires_permission_id')
                ->comment('The permission that must be present for the above to be effective');
            $table->timestamps();

            $table->unique(['permission_id', 'requires_permission_id'], 'perm_dep_unique');
            $table->foreign('permission_id')->references('id')->on('permissions')->cascadeOnDelete();
            $table->foreign('requires_permission_id')->references('id')->on('permissions')->cascadeOnDelete();
        });

        // ── 5. role_permissions ──────────────────────────────────────────────
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->unsignedBigInteger('role_id');
            $table->unsignedBigInteger('permission_id');
            $table->timestamps();

            $table->primary(['role_id', 'permission_id']);
            $table->foreign('role_id')->references('id')->on('roles')->cascadeOnDelete();
            $table->foreign('permission_id')->references('id')->on('permissions')->restrictOnDelete();
        });

        // ── 6. admin_roles ───────────────────────────────────────────────────
        Schema::create('admin_roles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')
                ->comment('Must be a user with role = admin');
            $table->unsignedBigInteger('role_id');
            $table->unsignedBigInteger('assigned_by')->nullable()
                ->comment('Super Admin who performed the assignment');
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamps(); // created_at / updated_at for pivot compatibility

            $table->unique(['user_id', 'role_id'], 'admin_role_unique');
            $table->index('user_id');
            $table->index('role_id');

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('role_id')->references('id')->on('roles')->cascadeOnDelete();
            $table->foreign('assigned_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_roles');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permission_dependencies');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'is_super_admin')) {
                $table->dropColumn('is_super_admin');
            }
        });
    }
};
