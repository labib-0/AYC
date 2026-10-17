<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;

class ReceiptImageService
{
    /**
     * Maximum accepted source image size in bytes (10 MB).
     */
    public const MAX_SOURCE_BYTES = 10485760; // 10 * 1024 * 1024

    /**
     * Maximum accepted image dimensions in pixels.
     */
    public const MAX_DIMENSION_PX = 8000;
    public const MIN_DIMENSION_PX = 10;

    /**
     * WebP compression quality setting (85 retains razor-sharp printed text, amounts, & stamps).
     */
    public const WEBP_QUALITY = 85;

    /**
     * Validate, convert, and store an uploaded receipt image as WebP.
     *
     * @param  UploadedFile  $file
     * @param  string  $orderNumber
     * @return array{path: string, url: string, filename: string, mime_type: string, size: int, original_name: string}
     *
     * @throws ValidationException
     * @throws \RuntimeException
     */
    public function convertAndStore(UploadedFile $file, string $orderNumber): array
    {
        // 1. Enforce strict 10MB source limit
        $size = $file->getSize();
        if ($size > self::MAX_SOURCE_BYTES) {
            throw ValidationException::withMessages([
                'receipt' => ['Receipt file exceeds the 10 MB size limit. Please upload an image under 10 MB.'],
            ]);
        }

        // 2. Validate real file contents and MIME type (do not trust only client extension)
        $realMime = $file->getMimeType();
        $allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!in_array($realMime, $allowedMimes, true)) {
            throw ValidationException::withMessages([
                'receipt' => ['Invalid file format. Only JPG, JPEG, PNG, and WebP images up to 10 MB are accepted.'],
            ]);
        }

        // 3. Verify server WebP encoder availability
        if (!function_exists('imagewebp')) {
            throw new \RuntimeException('WebP image encoder is not available on this server runtime.');
        }

        // 4. Safe image decoding using GD driver
        try {
            $manager = new ImageManager(new Driver());
            $image = $manager->decodePath($file->getRealPath());
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'receipt' => ['Corrupted or invalid image file. Please provide a legible receipt image.'],
            ]);
        }

        // 5. Dimension safety checks to prevent memory exhaustion / DoS
        $width = $image->width();
        $height = $image->height();
        if ($width < self::MIN_DIMENSION_PX || $height < self::MIN_DIMENSION_PX) {
            throw ValidationException::withMessages([
                'receipt' => ['Image resolution is too small to be a legible receipt.'],
            ]);
        }
        if ($width > self::MAX_DIMENSION_PX || $height > self::MAX_DIMENSION_PX) {
            throw ValidationException::withMessages([
                'receipt' => ["Image dimensions ({$width}x{$height}px) exceed the maximum permitted resolution of 8000x8000px."],
            ]);
        }

        // 6. Convert to WebP preserving readability of text, amounts, dates, and account numbers
        try {
            $encoded = $image->encode(new WebpEncoder(quality: self::WEBP_QUALITY));
        } catch (\Throwable $e) {
            throw new \RuntimeException("Failed to encode receipt to WebP format: " . $e->getMessage());
        }

        // 7. Generate safe, unique storage filename with .webp extension
        $cleanOrder = Str::slug($orderNumber, '_') ?: 'order';
        $uniqueToken = bin2hex(random_bytes(6));
        $timestamp = time();
        $filename = "receipt_{$cleanOrder}_{$uniqueToken}_{$timestamp}.webp";
        $storagePath = "order-receipts/{$filename}";

        // 8. Store converted WebP to public storage disk
        $stored = Storage::disk('public')->put($storagePath, (string) $encoded);
        if (!$stored || !Storage::disk('public')->exists($storagePath)) {
            throw new \RuntimeException('Failed to store converted WebP receipt to storage disk.');
        }

        $storedSize = Storage::disk('public')->size($storagePath);
        if ($storedSize === 0) {
            Storage::disk('public')->delete($storagePath);
            throw new \RuntimeException('Stored WebP receipt has zero bytes.');
        }

        $origBase = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $cleanOrigName = Str::slug($origBase, '_') ?: 'receipt';

        return [
            'path' => $storagePath,
            'url' => asset('storage/' . $storagePath),
            'filename' => $filename,
            'mime_type' => 'image/webp',
            'size' => $storedSize,
            'original_name' => "{$cleanOrigName}.webp",
        ];
    }
}
