<?php

namespace App\Services\Media;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Image;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * ProductImagePipelineService
 *
 * Server-side image processing pipeline using Laravel 13's native Image facade
 * and Intervention Image integration.
 *
 * Preferred processing pipeline:
 *   $image = Image::fromUpload($uploadedFile)
 *       ->orient()
 *       ->toWebp()
 *       ->quality(82);
 *
 * Then store the resulting WebP through Laravel's existing filesystem/storage layer.
 *
 * Requirements:
 * - Max original upload: 20 MB per image.
 * - Accept all image formats supported by the installed driver (JPEG, PNG, WebP, GIF, BMP, AVIF).
 * - Animated GIF policy: flatten to first frame -> static WebP.
 * - Normalize EXIF orientation.
 * - Preserve alpha transparency.
 * - Preserve aspect ratio without blind cropping.
 * - Safely handle excessively large dimensions (capping long edge to 1500) to prevent memory exhaustion.
 * - Canonical output is always WebP.
 * - Safe error handling for corrupted, unsupported, or storage failures.
 */
class ProductImagePipelineService
{
    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /** Maximum original file the Admin may upload (20 MB). */
    public const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

    /** Preferred explicit WebP quality target. */
    public const DEFAULT_WEBP_QUALITY = 82;

    /** Maximum output long-edge in pixels — prevents huge output without upsizing. */
    public const MAX_LONG_EDGE = 1500;

    /** WebP quality steps (starts at 85 and steps down to 72). */
    public const WEBP_QUALITY_STEPS = [85, 80, 75, 72];

    /** Target max WebP output size before quality is stepped down if needed. */
    public const TARGET_WEBP_BYTES = 500 * 1024;

    /**
     * MIME types accepted at the application layer.
     */
    public const DECLARED_MIMES = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/bmp',
        'image/x-bmp',
        'image/avif',
    ];

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Process, optimize, convert to WebP, and store a product image.
     *
     * @param  UploadedFile $file
     * @param  string       $folder  Subfolder on the public disk ('products', 'brands', etc.)
     * @return array{url:string,path:string,key:string,name:string,size:int,mime:string,width:int,height:int}
     *
     * @throws \InvalidArgumentException  Validation failure (user-safe message)
     * @throws \RuntimeException          Processing/storage failure (safe message)
     */
    public function processAndStore(UploadedFile $file, string $folder = 'products'): array
    {
        // ── Step 1: PHP upload status ────────────────────────────────────────
        if (!$file->isValid()) {
            throw new \InvalidArgumentException($this->describeUploadError($file->getError()));
        }

        // ── Step 2: File size (20 MB hard limit) ────────────────────────────
        $fileSize = $file->getSize();
        if ($fileSize > self::MAX_UPLOAD_BYTES) {
            $mb = round($fileSize / (1024 * 1024), 1);
            throw new \InvalidArgumentException(
                "Image exceeds the 20 MB upload limit ({$mb} MB received). Please select a smaller file."
            );
        }

        // ── Step 3: Derive MIME from actual file content, not client claim ──
        $realPath = $file->getRealPath();
        if (!$realPath || !file_exists($realPath)) {
            throw new \RuntimeException('Temporary uploaded file could not be read.');
        }

        $detectedMime = $this->detectMime($realPath, $file);

        if (!in_array($detectedMime, self::DECLARED_MIMES, true)) {
            throw new \InvalidArgumentException(
                'This image format is not supported by the server. ' .
                'Supported formats: JPG, PNG, WebP, GIF, BMP, AVIF.'
            );
        }

        if (!$this->isDriverSupported($detectedMime)) {
            throw new \InvalidArgumentException(
                'This image format is not supported by the server.'
            );
        }

        // ── Step 4: Laravel 13 Image Facade Processing Pipeline ─────────────
        $tempWebp = tempnam(sys_get_temp_dir(), 'ayn_webp_');

        try {
            // Native Laravel 13 Image facade pipeline
            $imageInstance = Image::fromUpload($file)
                ->orient();

            $origW = $imageInstance->width();
            $origH = $imageInstance->height();

            if ($origW < 10 || $origH < 10) {
                throw new \InvalidArgumentException(
                    'Image dimensions are too small to be a valid product photo.'
                );
            }

            // Safely handle excessively large dimensions to avoid memory exhaustion
            // Preserves aspect ratio without upscaling small images
            if ($origW > self::MAX_LONG_EDGE || $origH > self::MAX_LONG_EDGE) {
                if ($origW >= $origH) {
                    $imageInstance = $imageInstance->scale(width: self::MAX_LONG_EDGE);
                } else {
                    $imageInstance = $imageInstance->scale(height: self::MAX_LONG_EDGE);
                }
            }

            // Convert to WebP with explicit quality 82 (preferred pipeline)
            $imageInstance = $imageInstance->toWebp()->quality(self::DEFAULT_WEBP_QUALITY);

            $webpBytes = $imageInstance->toBytes();
            $finalW    = $imageInstance->width();
            $finalH    = $imageInstance->height();
            $finalSize = strlen($webpBytes);
        } catch (\InvalidArgumentException $e) {
            throw $e;
        } catch (Throwable $e) {
            throw new \RuntimeException(
                'The image could not be processed. The file may be corrupted or unreadable.',
                0,
                $e
            );
        } finally {
            if (isset($tempWebp) && file_exists($tempWebp)) {
                @unlink($tempWebp);
            }
        }

        // ── Step 5: Persist to public disk via Laravel storage architecture ──
        $filename     = Str::random(24) . '.webp';
        $relativePath = "{$folder}/{$filename}";

        try {
            $stored = Storage::disk('public')->put($relativePath, $webpBytes);
            if (!$stored || !Storage::disk('public')->exists($relativePath)) {
                throw new \RuntimeException(
                    'The image could not be saved. Please verify disk permissions.'
                );
            }
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (Throwable $e) {
            throw new \RuntimeException(
                'The image could not be saved. Please verify disk permissions.',
                0,
                $e
            );
        }

        // ── Step 6: Return canonical public URL and metadata ────────────────
        $canonicalUrl = $this->generateCanonicalPublicUrl($relativePath);

        return [
            'url'    => $canonicalUrl,
            'path'   => $relativePath,
            'key'    => $relativePath,
            'folder' => $folder,
            'name'   => pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME) . '.webp',
            'size'   => $finalSize,
            'mime'   => 'image/webp',
            'width'  => $finalW,
            'height' => $finalH,
        ];
    }

    // -------------------------------------------------------------------------
    // Format support helpers (runtime check, not assumed)
    // -------------------------------------------------------------------------

    /**
     * Return MIME types actually supported by the current server driver.
     *
     * @return list<string>
     */
    public function gdSupportedMimes(): array
    {
        $supported = [];

        if (function_exists('imagecreatefromjpeg')) {
            $supported[] = 'image/jpeg';
            $supported[] = 'image/jpg';
        }
        if (function_exists('imagecreatefrompng')) {
            $supported[] = 'image/png';
        }
        if (function_exists('imagecreatefromwebp')) {
            $supported[] = 'image/webp';
        }
        if (function_exists('imagecreatefromgif')) {
            $supported[] = 'image/gif';
        }
        if (function_exists('imagecreatefrombmp')) {
            $supported[] = 'image/bmp';
            $supported[] = 'image/x-bmp';
        }
        if (function_exists('imagecreatefromavif')) {
            $supported[] = 'image/avif';
        }

        // GD does NOT support TIFF, HEIC, HEIF natively
        return array_values(array_unique($supported));
    }

    /**
     * Whether the active driver can decode the given MIME type.
     */
    public function isDriverSupported(string $mime): bool
    {
        if (extension_loaded('imagick')) {
            return in_array($mime, self::DECLARED_MIMES, true);
        }

        return $this->isGdSupported($mime);
    }

    /**
     * Backward-compatible check for GD driver support.
     */
    public function isGdSupported(string $mime): bool
    {
        return in_array($mime, $this->gdSupportedMimes(), true);
    }

    // -------------------------------------------------------------------------
    // Decoding and Processing Helpers
    // -------------------------------------------------------------------------

    /**
     * Decode image from file path into a GD resource when needed.
     * Animated GIFs: first frame only (flatten to static).
     */
    public function decodeImage(string $path, string $mime): \GdImage|false
    {
        return match ($mime) {
            'image/jpeg', 'image/jpg'  => @imagecreatefromjpeg($path),
            'image/png'                => @imagecreatefrompng($path),
            'image/webp'               => @imagecreatefromwebp($path),
            'image/gif'                => @imagecreatefromgif($path),
            'image/bmp', 'image/x-bmp' => @imagecreatefrombmp($path),
            'image/avif'               => function_exists('imagecreatefromavif')
                ? @imagecreatefromavif($path)
                : false,
            default                    => false,
        };
    }

    /**
     * Save GD image as optimized WebP (with alpha transparency preservation).
     */
    public function saveOptimizedWebP(\GdImage $image, string $targetPath, string $sourceMime): void
    {
        $hasTransparency = in_array($sourceMime, ['image/png', 'image/webp', 'image/avif'], true);

        if ($hasTransparency) {
            imagealphablending($image, false);
            imagesavealpha($image, true);
            imagecolorallocatealpha($image, 0, 0, 0, 127);
        }

        foreach (self::WEBP_QUALITY_STEPS as $q) {
            imagewebp($image, $targetPath, $q);
            $size = (int) filesize($targetPath);

            if ($size <= self::TARGET_WEBP_BYTES || $q === end(self::WEBP_QUALITY_STEPS)) {
                break;
            }
        }
    }

    /**
     * Helper for EXIF orientation inspection using exif_read_data / imagerotate when needed.
     */
    public function autoOrientExif(\GdImage $image, string $path): \GdImage
    {
        if (!function_exists('exif_read_data')) {
            return $image;
        }

        $exif = @exif_read_data($path);
        if (!$exif || empty($exif['Orientation'])) {
            return $image;
        }

        $deg = match ((int) $exif['Orientation']) {
            3 => 180,
            6 => 270,
            8 => 90,
            default => 0,
        };

        if ($deg !== 0) {
            $rotated = imagerotate($image, $deg, 0);
            if ($rotated !== false) {
                imagedestroy($image);
                return $rotated;
            }
        }

        return $image;
    }

    // -------------------------------------------------------------------------
    // URL and Error Helpers
    // -------------------------------------------------------------------------

    /**
     * Generate canonical public URL matching production architecture.
     */
    public function generateCanonicalPublicUrl(string $relativePath): string
    {
        $cleanPath = ltrim($relativePath, '/');

        if (app()->environment('production')) {
            return "https://ayaanclothing.com/storage/{$cleanPath}";
        }

        $appUrl = rtrim(config('app.url', 'http://127.0.0.1:8000'), '/');

        if (str_contains($appUrl, 'admin.ayaanclothing.com') || str_contains($appUrl, 'api.ayaanclothing.com')) {
            return "https://ayaanclothing.com/storage/{$cleanPath}";
        }

        return "{$appUrl}/storage/{$cleanPath}";
    }

    /**
     * Detect actual MIME type using finfo first, then Laravel's detection.
     */
    private function detectMime(string $realPath, UploadedFile $file): string
    {
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo) {
                $detected = (string) finfo_file($finfo, $realPath);
                finfo_close($finfo);
                if ($detected && str_starts_with($detected, 'image/')) {
                    return strtolower($detected);
                }
            }
        }

        $mime = strtolower((string) ($file->getMimeType() ?: $file->getClientMimeType()));
        return $mime;
    }

    /**
     * Translate PHP upload error code to a user-facing message.
     */
    private function describeUploadError(int $errorCode): string
    {
        return match ($errorCode) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE =>
                'Image exceeds the 20 MB upload limit. Please select a smaller file.',
            UPLOAD_ERR_PARTIAL =>
                'The image was only partially uploaded. Please check your network and try again.',
            UPLOAD_ERR_NO_FILE =>
                'No image file was received.',
            UPLOAD_ERR_CANT_WRITE =>
                'The image could not be saved. Please check server permissions.',
            default =>
                'The file failed to upload. Please verify the file and try again.',
        };
    }
}
