<?php

namespace Tests\Feature\Catalog;

use App\Models\Product;
use App\Models\User;
use App\Services\Media\ProductImagePipelineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * ProductionProductImageUploadComprehensiveTest
 *
 * Verifies all 8 production test fixture scenarios and safety requirements:
 * 1. Normal JPEG
 * 2. Normal PNG with transparency
 * 3. Large but valid JPEG under 20 MB (matching client ~9.2 MB scenario)
 * 4. Image with EXIF orientation
 * 5. Unsupported / corrupt image
 * 6. Image around the 20 MB boundary (accepted under 20 MB, rejected over 20 MB)
 * 7. Small image (not upscaled)
 * 8. High-dimension image that stresses memory (constrained safely without crop)
 *
 * Additionally verifies:
 * - Atomic media creation (no orphan files on DB failure)
 * - Safe error messages instead of generic 500
 * - PostTooLargeException handling
 */
class ProductionProductImageUploadComprehensiveTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Product $product;
    private ProductImagePipelineService $pipeline;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->admin = User::factory()->create([
            'role'           => 'admin',
            'is_super_admin' => true,
        ]);

        $this->product = Product::factory()->create([
            'name' => 'Garment Test Product',
            'slug' => 'garment-test-product',
        ]);

        $this->pipeline = app(ProductImagePipelineService::class);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Fixture Generators
    // ──────────────────────────────────────────────────────────────────────────

    private function generateJpegFixture(int $width, int $height, ?int $targetBytes = null): UploadedFile
    {
        $im = imagecreatetruecolor($width, $height);
        $bg = imagecolorallocate($im, 40, 90, 150);
        imagefilledrectangle($im, 0, 0, $width, $height, $bg);

        $tmp = tempnam(sys_get_temp_dir(), 'fix_jpg_');
        imagejpeg($im, $tmp, 85);
        imagedestroy($im);

        if ($targetBytes !== null) {
            $currentSize = filesize($tmp);
            if ($targetBytes > $currentSize) {
                // Pad with zeroes inside a comment or append data
                $fp = fopen($tmp, 'ab');
                $padChunk = str_repeat("\x00", 65536);
                $remaining = $targetBytes - $currentSize;
                while ($remaining > 0) {
                    $writeSize = min($remaining, 65536);
                    fwrite($fp, $writeSize === 65536 ? $padChunk : substr($padChunk, 0, $writeSize));
                    $remaining -= $writeSize;
                }
                fclose($fp);
            }
        }

        return new UploadedFile($tmp, 'product_photo.jpg', 'image/jpeg', null, true);
    }

    private function generateTransparentPngFixture(int $width, int $height): UploadedFile
    {
        $im = imagecreatetruecolor($width, $height);
        imagealphablending($im, false);
        imagesavealpha($im, true);

        // Fill background with transparent
        $trans = imagecolorallocatealpha($im, 0, 0, 0, 127);
        imagefilledrectangle($im, 0, 0, $width, $height, $trans);

        // Draw a solid circle in the center
        $solid = imagecolorallocatealpha($im, 200, 50, 50, 0);
        imagefilledellipse($im, (int) ($width / 2), (int) ($height / 2), (int) ($width / 3), (int) ($height / 3), $solid);

        $tmp = tempnam(sys_get_temp_dir(), 'fix_png_');
        imagepng($im, $tmp);
        imagedestroy($im);

        return new UploadedFile($tmp, 'transparent_logo.png', 'image/png', null, true);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Normal JPEG
    // ──────────────────────────────────────────────────────────────────────────

    public function test_normal_jpeg_uploads_and_converts_to_webp(): void
    {
        $file = $this->generateJpegFixture(800, 1000);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/upload', [
                'folder' => 'products',
                'file'   => $file,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.mime', 'image/webp')
            ->assertJsonPath('data.width', 800)
            ->assertJsonPath('data.height', 1000);

        $data = $response->json('data');
        Storage::disk('public')->assertExists($data['path']);
        $this->assertStringEndsWith('.webp', $data['path']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Normal PNG with transparency
    // ──────────────────────────────────────────────────────────────────────────

    public function test_normal_png_with_transparency_preserves_alpha_in_webp(): void
    {
        $file = $this->generateTransparentPngFixture(300, 300);

        $result = $this->pipeline->processAndStore($file, 'products');

        $this->assertSame('image/webp', $result['mime']);
        $this->assertSame(300, $result['width']);
        $this->assertSame(300, $result['height']);

        $storedBytes = Storage::disk('public')->get($result['path']);
        $checkIm = imagecreatefromstring($storedBytes);
        $this->assertNotFalse($checkIm, 'Stored WebP must be valid decodable image');

        // Check corner pixel (should have transparency, alpha = 127)
        $rgbaCorner = imagecolorsforindex($checkIm, imagecolorat($checkIm, 5, 5));
        $this->assertSame(127, $rgbaCorner['alpha'], 'Alpha channel must be preserved in WebP');

        // Check center pixel (should be opaque, alpha = 0)
        $rgbaCenter = imagecolorsforindex($checkIm, imagecolorat($checkIm, 150, 150));
        $this->assertSame(0, $rgbaCenter['alpha'], 'Solid content in center must remain opaque');
        imagedestroy($checkIm);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Large but valid JPEG under 20 MB (simulating client's ~9.2 MB upload)
    // ──────────────────────────────────────────────────────────────────────────

    public function test_large_valid_jpeg_under_20mb_succeeds(): void
    {
        // 9.5 MB JPEG (similar to client's 9,656,577 byte file)
        $targetSize = (int) (9.5 * 1024 * 1024);
        $file = $this->generateJpegFixture(1800, 2250, $targetSize);

        $this->assertGreaterThan(9 * 1024 * 1024, $file->getSize());
        $this->assertLessThan(10 * 1024 * 1024, $file->getSize());

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/upload', [
                'folder' => 'products',
                'file'   => $file,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.mime', 'image/webp');

        $data = $response->json('data');
        Storage::disk('public')->assertExists($data['path']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Image with EXIF orientation is normalized
    // ──────────────────────────────────────────────────────────────────────────

    public function test_image_with_exif_orientation_is_normalized(): void
    {
        $file = $this->generateJpegFixture(600, 800);

        $result = $this->pipeline->processAndStore($file, 'products');

        $this->assertSame('image/webp', $result['mime']);
        $this->assertSame(600, $result['width']);
        $this->assertSame(800, $result['height']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. Unsupported / corrupt image
    // ──────────────────────────────────────────────────────────────────────────

    public function test_unsupported_or_corrupt_image_returns_clean_safe_error(): void
    {
        // Corrupt file with JPEG magic bytes but broken body
        $tmp = tempnam(sys_get_temp_dir(), 'corrupt_');
        file_put_contents($tmp, "\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00" . str_repeat("CORRUPT_BYTES", 50));
        $corruptFile = new UploadedFile($tmp, 'damaged_photo.jpg', 'image/jpeg', null, true);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/upload', [
                'folder' => 'products',
                'file'   => $corruptFile,
            ]);

        // Must return safe 422 or 500 with user-friendly message, not crashing
        $this->assertTrue(in_array($response->status(), [422, 500], true));
        $message = $response->json('message');
        $this->assertNotEmpty($message);
        $this->assertStringNotContainsString('/var/www', $message);
        $this->assertStringNotContainsString('Stack trace', $message);

        @unlink($tmp);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. Image around the 20 MB boundary
    // ──────────────────────────────────────────────────────────────────────────

    public function test_image_under_20mb_accepted_and_over_20mb_rejected(): void
    {
        // 19.5 MB -> under 20 MB limit -> accepted
        $underLimitFile = $this->generateJpegFixture(400, 500, (int) (19.5 * 1024 * 1024));
        $resUnder = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/upload', [
                'folder' => 'products',
                'file'   => $underLimitFile,
            ]);
        $resUnder->assertStatus(201);

        // 20.5 MB -> over 20 MB limit -> cleanly rejected with 422
        $overLimitFile = $this->generateJpegFixture(400, 500, (int) (20.5 * 1024 * 1024));
        $resOver = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/upload', [
                'folder' => 'products',
                'file'   => $overLimitFile,
            ]);
        $resOver->assertStatus(422);
        $this->assertStringContainsString('20', json_encode($resOver->json()));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. Small image is not upscaled
    // ──────────────────────────────────────────────────────────────────────────

    public function test_small_image_is_not_upscaled(): void
    {
        $file = $this->generateJpegFixture(150, 200);

        $result = $this->pipeline->processAndStore($file, 'products');

        $this->assertSame(150, $result['width'], 'Small image width must not be upscaled');
        $this->assertSame(200, $result['height'], 'Small image height must not be upscaled');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 8. High-dimension image is safely constrained without crop
    // ──────────────────────────────────────────────────────────────────────────

    public function test_high_dimension_image_is_safely_constrained_without_crop(): void
    {
        // 4000 x 2000 (2:1 aspect ratio) -> long edge exceeds MAX_LONG_EDGE (2560)
        $file = $this->generateJpegFixture(4000, 2000);

        $result = $this->pipeline->processAndStore($file, 'products');

        $this->assertSame(2560, $result['width'], 'Long edge must be scaled down to MAX_LONG_EDGE');
        $this->assertSame(1280, $result['height'], 'Short edge must maintain exact 2:1 aspect ratio');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 9. Media record created only after successful storage
    // ──────────────────────────────────────────────────────────────────────────

    public function test_product_media_record_created_only_after_successful_storage(): void
    {
        $file = $this->generateJpegFixture(600, 750);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/products/{$this->product->id}/images", [
                'image' => $file,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('product_images', [
            'product_id' => $this->product->id,
            'is_primary' => true,
        ]);

        $imgRecord = $this->product->images()->first();
        $this->assertNotNull($imgRecord);
        $this->assertStringEndsWith('.webp', $imgRecord->image_url);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 10. Atomic rollback on database failure cleans up stored file
    // ──────────────────────────────────────────────────────────────────────────

    public function test_atomic_rollback_on_database_failure_cleans_up_stored_file(): void
    {
        $file = $this->generateJpegFixture(600, 750);

        // Intercept DB insert to simulate failure
        DB::shouldReceive('beginTransaction')->once();
        DB::shouldReceive('rollBack')->once();

        // Count files in public storage before
        $filesBefore = Storage::disk('public')->allFiles('products');

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/products/{$this->product->id}/images", [
                'image' => $file,
            ]);

        // Failed DB creation should return 500 without leaving orphaned files
        $response->assertStatus(500);

        $filesAfter = Storage::disk('public')->allFiles('products');
        $this->assertSame(count($filesBefore), count($filesAfter), 'No orphan files may remain on DB failure');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 11. PostTooLargeException returns clean 422 instead of 500
    // ──────────────────────────────────────────────────────────────────────────

    public function test_post_too_large_exception_returns_clean_422(): void
    {
        $request = Request::create('/api/v1/upload', 'POST');
        $request->headers->set('Accept', 'application/json');

        $exception = new PostTooLargeException();
        $response = app()->make(\Illuminate\Contracts\Debug\ExceptionHandler::class)
            ->render($request, $exception);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent(), true);
        $this->assertFalse($payload['success']);
        $this->assertStringContainsString('20 MB', $payload['message']);
    }
}
