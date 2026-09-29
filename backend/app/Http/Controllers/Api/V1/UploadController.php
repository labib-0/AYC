<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Services\Media\ProductImagePipelineService;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * General-purpose file upload controller.
 * Handles product images, brand logos, banners, and other admin media.
 *
 * Pipeline: UPLOAD → VALIDATE → DECODE → NORMALIZE → CONVERT TO WEBP → STORE → RETURN
 *
 * POST /api/v1/upload
 * Auth: Bearer token (admin required)
 *
 * Supported input formats: JPG, PNG, WebP, GIF, BMP, AVIF
 * Output always: WebP (image/webp)
 * Max upload: 20 MB per image
 */
class UploadController extends ApiController
{
    /** 20 MB expressed as Laravel validation kilobytes (1 KB = 1024 bytes). */
    private const MAX_KB = 20 * 1024;

    public function __construct(
        private readonly AdminAuthorizationService $authorization,
        private readonly ProductImagePipelineService $imagePipeline
    ) {}

    /**
     * Upload, validate, convert to WebP, and store an image.
     * Returns canonical WebP URL and metadata.
     *
     * Accepted folders: products, brands, categories, banners
     */
    public function upload(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->isAdmin()) {
            return $this->forbidden('Administrator access required.');
        }

        // Proactively inspect PHP-level upload errors before Laravel validation
        $file = $request->file('file');
        if ($file && !$file->isValid()) {
            $err = $file->getError();
            $msg = match ($err) {
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
            return $this->error($msg, 422);
        }

        $folder = $request->input('folder', 'products');

        // Laravel validation: broad MIME list, 20 MB max
        // The pipeline service performs deeper content-level validation.
        $request->validate([
            'file'   => [
                'required',
                'file',
                'image',
                'mimes:jpeg,jpg,png,webp,gif,bmp,avif',
                'max:' . self::MAX_KB,
            ],
            'folder' => ['nullable', 'string', 'in:products,brands,categories,banners'],
        ], [
            'file.required' => 'Please select an image file to upload.',
            'file.file'     => 'The uploaded item must be a valid file.',
            'file.image'    => 'The file must be a valid image.',
            'file.mimes'    => 'Unsupported image format. Supported formats: JPG, PNG, WebP, GIF, BMP, AVIF.',
            'file.max'      => 'Image exceeds the 20 MB upload limit. Please select a smaller file.',
        ]);

        // Per-folder authorization
        $allowed = match ($folder) {
            'products'   => $this->authorization->can($user, 'product.image.upload'),
            'brands'     => $this->authorization->can($user, 'brand.edit') || $this->authorization->can($user, 'brand.create'),
            'categories' => $this->authorization->can($user, 'category.edit') || $this->authorization->can($user, 'category.create'),
            'banners'    => $this->authorization->can($user, 'homepage.banner.edit'),
            default      => false,
        };

        if (!$allowed) {
            return $this->forbidden("Forbidden: insufficient permission to upload media to '{$folder}'.");
        }

        $context = [
            'folder'    => $folder,
            'admin_id'  => $user->id,
            'source_ip' => $request->ip(),
        ];

        try {
            $result = $this->imagePipeline->processAndStore($file, $folder, $context);
            return $this->success($result, 'File uploaded and converted to WebP successfully.', 201);
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\RuntimeException $e) {
            \Illuminate\Support\Facades\Log::error('UploadController runtime error', [
                'admin_id'          => $user->id,
                'folder'            => $folder,
                'filename'          => $file->getClientOriginalName(),
                'size'              => $file->getSize(),
                'exception_class'   => get_class($e),
                'exception_message' => $e->getMessage(),
            ]);
            return $this->serverError($e->getMessage());
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('UploadController unexpected error', [
                'admin_id'          => $user->id,
                'folder'            => $folder,
                'filename'          => $file->getClientOriginalName(),
                'size'              => $file->getSize(),
                'exception_class'   => get_class($e),
                'exception_message' => $e->getMessage(),
            ]);
            return $this->serverError('Image processing failed. Please try again.');
        }
    }
}
