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
     * Supported MIME types for receipt images by native decoder.
     */
    public const SUPPORTED_MIMES = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/bmp',
        'image/x-ms-bmp',
        'image/avif',
    ];

    /**
     * Formats that require external ImageMagick / libheif / libvips libraries.
     */
    public const EXTERNAL_DECODER_MIMES = [
        'image/heic' => 'HEIC/HEIF',
        'image/heif' => 'HEIC/HEIF',
        'image/tiff' => 'TIFF',
    ];

    /**
     * Validate, convert, and store an uploaded receipt image as WebP while preserving original evidence.
     *
     * @param  UploadedFile  $file
     * @param  string  $orderNumber
     * @return array{path: string, url: string, filename: string, mime_type: string, size: int, original_name: string, original_path: string, original_url: string, original_mime_type: string}
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

        // 2. Reject active content (e.g. unsanitized SVG)
        $realMime = strtolower((string) $file->getMimeType());
        if (str_contains($realMime, 'svg') || str_contains($realMime, 'xml')) {
            throw ValidationException::withMessages([
                'receipt' => ['SVG vector files are not permitted as payment receipts for security reasons. Please upload a standard image (JPG, PNG, WebP, AVIF, GIF, or BMP).'],
            ]);
        }

        // 3. Check for formats requiring external decoders (e.g. HEIC / TIFF without Imagick)
        if (isset(self::EXTERNAL_DECODER_MIMES[$realMime])) {
            $formatName = self::EXTERNAL_DECODER_MIMES[$realMime];
            if (!extension_loaded('imagick')) {
                throw ValidationException::withMessages([
                    'receipt' => ["The uploaded {$formatName} image requires an ImageMagick decoder, which is not configured on this server. Please convert or save your receipt as JPG, PNG, WebP, AVIF, GIF, or BMP and try again."],
                ]);
            }
        }

        // 4. Validate real file contents and MIME type
        if (!in_array($realMime, self::SUPPORTED_MIMES, true) && !isset(self::EXTERNAL_DECODER_MIMES[$realMime])) {
            throw ValidationException::withMessages([
                'receipt' => ['Invalid file format. Supported receipt formats: JPG, PNG, WebP, AVIF, GIF, and BMP (up to 10 MB).'],
            ]);
        }

        // 5. Verify server WebP encoder availability
        if (!function_exists('imagewebp')) {
            throw new \RuntimeException('WebP image encoder is not available on this server runtime.');
        }

        // 6. Safe image decoding using GD driver (extracts first frame for animated GIF)
        try {
            $manager = new ImageManager(new Driver());
            $image = $manager->decodePath($file->getRealPath());
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'receipt' => ['Corrupted or unreadable image file. Please provide a legible receipt image.'],
            ]);
        }

        // 7. Dimension safety checks to prevent memory exhaustion / DoS
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

        // 8. Convert to WebP preserving readability of text, amounts, dates, and account numbers
        try {
            $encoded = $image->encode(new WebpEncoder(quality: self::WEBP_QUALITY));
        } catch (\Throwable $e) {
            throw new \RuntimeException("Failed to encode receipt to WebP format: " . $e->getMessage());
        }

        // 9. Generate safe, unique storage filename with .webp extension
        $cleanOrder = Str::slug($orderNumber, '_') ?: 'order';
        $uniqueToken = bin2hex(random_bytes(6));
        $timestamp = time();
        $filename = "receipt_{$cleanOrder}_{$uniqueToken}_{$timestamp}.webp";
        $storagePath = "order-receipts/{$filename}";

        // 10. Store converted WebP to public storage disk
        $stored = Storage::disk('public')->put($storagePath, (string) $encoded);
        if (!$stored || !Storage::disk('public')->exists($storagePath)) {
            throw new \RuntimeException('Failed to store converted WebP receipt to storage disk.');
        }

        $storedSize = Storage::disk('public')->size($storagePath);
        if ($storedSize === 0) {
            Storage::disk('public')->delete($storagePath);
            throw new \RuntimeException('Stored WebP receipt has zero bytes.');
        }

        // 11. Preserve original uploaded payment evidence securely in originals folder
        $origExt = strtolower($file->getClientOriginalExtension()) ?: 'img';
        $origFilename = "orig_{$cleanOrder}_{$uniqueToken}_{$timestamp}.{$origExt}";
        $origStoragePath = "order-receipts/originals/{$origFilename}";
        try {
            Storage::disk('public')->putFileAs('order-receipts/originals', $file, $origFilename);
        } catch (\Throwable $e) {
            // Non-fatal: if originals folder write fails, WebP derivative is still safely stored
            $origStoragePath = $storagePath;
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
            'original_path' => $origStoragePath,
            'original_url' => asset('storage/' . $origStoragePath),
            'original_mime_type' => $realMime,
        ];
    }
}
