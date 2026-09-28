<?php

namespace App\Services\Media;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductImagePipelineService
{
    public const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    public const TARGET_ASPECT_RATIO = 4 / 5;   // 0.8
    public const MAX_WIDTH = 1200;              // Standard crisp product resolution
    public const MAX_HEIGHT = 1500;

    public const ALLOWED_MIMES = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
    ];

    /**
     * Process, optimize, convert to WebP, and store a product image.
     *
     * @param UploadedFile $file
     * @param string $folder Subfolder on the public disk ('products', 'brands', etc.)
     * @return array{url: string, path: string, key: string, name: string, size: int, mime: string, width: int, height: int}
     *
     * @throws \InvalidArgumentException
     * @throws \RuntimeException
     */
    public function processAndStore(UploadedFile $file, string $folder = 'products'): array
    {
        // 1. Validate upload status from PHP
        if (!$file->isValid()) {
            $error = $file->getError();
            $msg = match ($error) {
                UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'The image exceeds the maximum upload limit (5 MB). Please select a smaller file.',
                UPLOAD_ERR_PARTIAL => 'The image was only partially uploaded. Please check your network and try again.',
                UPLOAD_ERR_NO_FILE => 'No image file was received.',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write image to disk. Please check server permissions.',
                default => 'The file failed to upload. Please verify the file and try again.',
            };
            throw new \InvalidArgumentException($msg);
        }

        // 2. Validate file size (5MB maximum)
        $fileSize = $file->getSize();
        if ($fileSize > self::MAX_BYTES) {
            $mb = round($fileSize / (1024 * 1024), 1);
            throw new \InvalidArgumentException("The image size ({$mb} MB) exceeds the 5 MB maximum limit. Please upload an image under 5 MB.");
        }

        // 3. Validate MIME type
        $mime = strtolower((string) ($file->getMimeType() ?: $file->getClientMimeType()));
        if (!in_array($mime, self::ALLOWED_MIMES, true)) {
            throw new \InvalidArgumentException('Unsupported image format. Allowed formats are JPG, JPEG, PNG, and WebP.');
        }

        $realPath = $file->getRealPath();
        if (!$realPath || !file_exists($realPath)) {
            throw new \RuntimeException('Temporary uploaded file could not be read.');
        }

        // 4. Decode image via GD
        $srcImage = $this->decodeImage($realPath, $mime);
        if (!$srcImage) {
            throw new \RuntimeException('Image decoding failed. The file may be corrupted or unreadable.');
        }

        try {
            // Apply EXIF orientation correction for JPEGs (iPhone camera photos)
            if ($mime === 'image/jpeg' || $mime === 'image/jpg') {
                $srcImage = $this->autoOrientExif($srcImage, $realPath);
            }

            $origW = imagesx($srcImage);
            $origH = imagesy($srcImage);

            if ($origW < 10 || $origH < 10) {
                throw new \InvalidArgumentException('Image dimensions are too small to be a valid product photo.');
            }

            // 5. 4:5 Aspect Ratio Framing & Resampling (for products)
            if ($folder === 'products') {
                $processedImage = $this->applyFourByFiveFraming($srcImage, $origW, $origH);
            } else {
                $processedImage = $this->resizePreservingAspect($srcImage, $origW, $origH);
            }

            $finalW = imagesx($processedImage);
            $finalH = imagesy($processedImage);

            // 6. Convert to optimized WebP (target 250-500 KB)
            $tempWebp = tempnam(sys_get_temp_dir(), 'ayn_webp_');
            $this->saveOptimizedWebP($processedImage, $tempWebp);

            $finalSize = filesize($tempWebp);

            // 7. Store to Laravel public disk
            $filename = Str::random(24) . '.webp';
            $relativePath = "{$folder}/{$filename}";

            $stored = Storage::disk('public')->put($relativePath, file_get_contents($tempWebp));
            if (!$stored || !Storage::disk('public')->exists($relativePath)) {
                throw new \RuntimeException('Failed to store optimized image in public storage. Please verify disk permissions.');
            }

            // 8. Canonical Public URL resolution
            $canonicalUrl = $this->generateCanonicalPublicUrl($relativePath);

            return [
                'url' => $canonicalUrl,
                'path' => $relativePath,
                'key' => $relativePath,
                'folder' => $folder,
                'name' => pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME) . '.webp',
                'size' => $finalSize,
                'mime' => 'image/webp',
                'width' => $finalW,
                'height' => $finalH,
            ];
        } finally {
            if (is_resource($srcImage) || (is_object($srcImage) && $srcImage instanceof \GdImage)) {
                imagedestroy($srcImage);
            }
            if (isset($processedImage) && (is_resource($processedImage) || (is_object($processedImage) && $processedImage instanceof \GdImage))) {
                imagedestroy($processedImage);
            }
            if (isset($tempWebp) && file_exists($tempWebp)) {
                @unlink($tempWebp);
            }
        }
    }

    /**
     * Decode image into GD resource from file path.
     */
    private function decodeImage(string $path, string $mime): \GdImage|false
    {
        return match ($mime) {
            'image/jpeg', 'image/jpg' => @imagecreatefromjpeg($path),
            'image/png' => @imagecreatefrompng($path),
            'image/webp' => @imagecreatefromwebp($path),
            default => @imagecreatefromstring((string) file_get_contents($path)),
        };
    }

    /**
     * Correct EXIF orientation for smartphone photos.
     */
    private function autoOrientExif(\GdImage $image, string $path): \GdImage
    {
        if (!function_exists('exif_read_data')) {
            return $image;
        }

        $exif = @exif_read_data($path);
        if (!$exif || empty($exif['Orientation'])) {
            return $image;
        }

        $orientation = (int) $exif['Orientation'];
        $deg = match ($orientation) {
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

    /**
     * Crop & resample source image to exact 4:5 aspect ratio without distortion.
     */
    private function applyFourByFiveFraming(\GdImage $src, int $origW, int $origH): \GdImage
    {
        $currentRatio = $origW / $origH;
        $targetRatio = self::TARGET_ASPECT_RATIO; // 0.8

        // Calculate center crop area
        if ($currentRatio > $targetRatio) {
            // Source is wider than 4:5 -> crop width
            $cropH = $origH;
            $cropW = (int) round($origH * $targetRatio);
            $cropX = (int) round(($origW - $cropW) / 2);
            $cropY = 0;
        } else {
            // Source is taller than 4:5 -> crop height
            $cropW = $origW;
            $cropH = (int) round($origW / $targetRatio);
            $cropX = 0;
            $cropY = (int) round(($origH - $cropH) / 2);
        }

        // Determine destination dimensions (cap at 1200x1500)
        $dstW = min($cropW, self::MAX_WIDTH);
        $dstH = (int) round($dstW / $targetRatio);

        $dst = imagecreatetruecolor($dstW, $dstH);

        // Alpha channel handling
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        $trans = imagecolorallocatealpha($dst, 255, 255, 255, 127);
        imagefilledrectangle($dst, 0, 0, $dstW, $dstH, $trans);

        imagecopyresampled($dst, $src, 0, 0, $cropX, $cropY, $dstW, $dstH, $cropW, $cropH);

        return $dst;
    }

    /**
     * Resize for non-product assets (brands, categories) preserving original aspect ratio.
     */
    private function resizePreservingAspect(\GdImage $src, int $origW, int $origH): \GdImage
    {
        $maxDimension = 1200;
        if ($origW <= $maxDimension && $origH <= $maxDimension) {
            // Keep original resolution
            $dstW = $origW;
            $dstH = $origH;
        } elseif ($origW >= $origH) {
            $dstW = $maxDimension;
            $dstH = (int) round($origH * ($maxDimension / $origW));
        } else {
            $dstH = $maxDimension;
            $dstW = (int) round($origW * ($maxDimension / $origH));
        }

        $dst = imagecreatetruecolor($dstW, $dstH);
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        $trans = imagecolorallocatealpha($dst, 255, 255, 255, 127);
        imagefilledrectangle($dst, 0, 0, $dstW, $dstH, $trans);

        imagecopyresampled($dst, $src, 0, 0, 0, 0, $dstW, $dstH, $origW, $origH);

        return $dst;
    }

    /**
     * Save GD image to WebP with target size 250–500 KB without destroying quality.
     */
    private function saveOptimizedWebP(\GdImage $image, string $targetPath): void
    {
        $qualities = [85, 80, 75, 72];

        foreach ($qualities as $q) {
            imagewebp($image, $targetPath, $q);
            $size = filesize($targetPath);

            // If under 500 KB, or at minimum quality tier, stop
            if ($size <= 500 * 1024 || $q === 72) {
                break;
            }
        }
    }

    /**
     * Generate canonical public URL matching production architecture.
     */
    public function generateCanonicalPublicUrl(string $relativePath): string
    {
        $cleanPath = ltrim($relativePath, '/');

        // On production, strictly use https://ayaanclothing.com/storage/...
        if (app()->environment('production')) {
            return "https://ayaanclothing.com/storage/{$cleanPath}";
        }

        $appUrl = rtrim(config('app.url', 'http://127.0.0.1:8000'), '/');

        // Avoid returning internal admin / api subdomains for storage assets
        if (str_contains($appUrl, 'admin.ayaanclothing.com') || str_contains($appUrl, 'api.ayaanclothing.com')) {
            return "https://ayaanclothing.com/storage/{$cleanPath}";
        }

        return "{$appUrl}/storage/{$cleanPath}";
    }
}
