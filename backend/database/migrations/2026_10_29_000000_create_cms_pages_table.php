<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('cms_pages')) {
            Schema::create('cms_pages', function (Blueprint $table) {
                $table->id();
                $table->string('title', 255);
                $table->string('slug', 255)->unique();
                $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
                $table->json('sections')->nullable();
                $table->json('draft_sections')->nullable();
                $table->unsignedBigInteger('parent_id')->nullable();
                $table->string('breadcrumb_label', 100)->nullable();
                $table->boolean('show_in_footer')->default(false);
                $table->string('footer_label', 100)->nullable();
                $table->integer('footer_sort_order')->default(0);
                $table->string('meta_title', 255)->nullable();
                $table->text('meta_description')->nullable();
                $table->string('canonical_url', 500)->nullable();
                $table->string('og_image_url', 500)->nullable();
                $table->boolean('is_indexable')->default(true);
                $table->timestamp('scheduled_publish_at')->nullable();
                $table->timestamp('scheduled_unpublish_at')->nullable();
                $table->timestamp('published_at')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->unsignedBigInteger('updated_by')->nullable();
                $table->json('previous_slugs')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index('status', 'idx_cms_pages_status');
                $table->index(['show_in_footer', 'footer_sort_order'], 'idx_cms_pages_footer');
                $table->index('published_at', 'idx_cms_pages_published_at');
                $table->index('parent_id', 'idx_cms_pages_parent_id');

                $table->foreign('parent_id')
                    ->references('id')
                    ->on('cms_pages')
                    ->onDelete('set null');

                $table->foreign('created_by')
                    ->references('id')
                    ->on('users')
                    ->onDelete('set null');

                $table->foreign('updated_by')
                    ->references('id')
                    ->on('users')
                    ->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cms_pages');
    }
};

