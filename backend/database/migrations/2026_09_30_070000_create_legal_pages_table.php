<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('legal_pages')) {
            Schema::create('legal_pages', function (Blueprint $table) {
                $table->id();
                $table->string('type', 50)->unique()->index();
                $table->string('title', 255);
                $table->longText('content');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });

            // Seed default privacy policy and terms & conditions so routes are never empty
            DB::table('legal_pages')->insert([
                [
                    'type' => 'privacy_policy',
                    'title' => 'Privacy Policy',
                    'content' => "## 1. Information We Collect\n\nAYAAN CLOTHING collects relevant corporate and business buyer information necessary to process wholesale apparel orders, manage export documentation, and maintain commercial trade communications. This includes buyer contact names, corporate email addresses, phone/WhatsApp numbers, delivery and port destinations, and commercial invoice details.\n\n## 2. How We Use Information\n\nYour commercial information is strictly utilized to:\n- Process and fulfill wholesale orders and Requests for Quotations (RFQs).\n- Coordinate international freight forwarding, customs clearance, and shipping documentation.\n- Provide direct B2B order status updates and commercial support.\n- Comply with statutory tax, customs, and banking regulations.\n\n## 3. Data Protection & Confidentiality\n\nWe do not sell, rent, or trade buyer contact details or purchasing history to third parties. Data is shared exclusively with authorized export logistical partners (customs brokers, freight carriers) and commercial banks solely to execute authorized transactions.\n\n## 4. Contact Us\n\nFor any privacy-related inquiries or data requests, please contact our export administration office.",
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'type' => 'terms_conditions',
                    'title' => 'Terms & Conditions',
                    'content' => "## 1. Scope & Minimum Order Quantities (MOQ)\n\nAll commercial transactions conducted through AYAAN CLOTHING are subject to export-grade B2B ready-made garment manufacturing standards. Products are sold subject to specified minimum order quantities per colorway and size allocation matrix as indicated in confirmed commercial proforma invoices.\n\n## 2. Quotations & Pricing\n\nAll catalog prices and issued quotations are quoted in US Dollars (USD) on FOB (Free On Board) or CIF terms as explicitly agreed. Quotations remain valid for 14 calendar days from the date of issuance due to raw material and freight fluctuations.\n\n## 3. Quality Assurance & Inspection\n\nProduction adheres to international garment manufacturing quality standards (AQL 2.5 Major / 4.0 Minor). Pre-shipment inspections by buyer-nominated third-party agencies (e.g., SGS, Bureau Veritas) are welcomed upon advance scheduling.\n\n## 4. Payment Terms & Commercial Invoicing\n\nAcceptable payment methods include Irrevocable Letter of Credit (L/C) at sight or Telegraphic Transfer (T/T) according to the payment schedule specified in the proforma invoice. Production commences upon receipt of the agreed deposit or operative L/C.\n\n## 5. Trademarks & Brand Disclaimer\n\nAll third-party brand names, logos, and trademarks referenced are the property of their respective owners. AYAAN CLOTHING operates as an independent apparel manufacturer and exporter.",
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('legal_pages');
    }
};
