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
 * Enforces validation, 4:5 aspect framing, WebP optimization, and canonical public URLs.
 *
 * POST /api/v1/upload
 * Auth: Bearer token (admin required)
 */
class UploadController extends ApiController
{
    public function __construct(
        private readonly AdminAuthorizationService $authorization,
        private readonly ProductImagePipelineService $imagePipeline
    ) {}

    /**
     * Upload, optimize, and store a file, returning a canonical public URL.
     *
     * Accepted folders: products, brands, categories, banners
     */
    public function upload(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->isAdmin()) {
            return $this->forbidden('Administrator access required.');
        }

        // Proactively inspect raw PHP upload errors for helpful feedback
        $file = $request->file('file');
        if ($file && !$file->isValid()) {
            $err = $file->getError();
            $msg = match ($err) {
                UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'The image exceeds the server upload limit (maximum 5MB). Please upload a smaller image.',
                UPLOAD_ERR_PARTIAL => 'The image was only partially uploaded. Please check your network connection and try again.',
                UPLOAD_ERR_NO_FILE => 'No image file was received.',
                UPLOAD_ERR_CANT_WRITE => 'Server temporary disk write failed. Please check permissions.',
                default => 'The file failed to upload. Please verify the file and try again.',
            };
            return $this->error($msg, 422);
        }

        $folder = $request->input('folder', 'products');

        $request->validate([
            'file' => ['required', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'folder' => ['nullable', 'string', 'in:products,brands,categories,banners'],
        ], [
            'file.required' => 'Please select an image file to upload.',
            'file.file' => 'The uploaded item must be a valid file.',
            'file.image' => 'The file must be a valid image (JPG, PNG, or WebP).',
            'file.mimes' => 'Unsupported format. Only JPG, PNG, and WebP images are supported.',
            'file.max' => 'The image exceeds the 5MB maximum file size limit. Please upload an image under 5MB.',
        ]);

        // Granular upload authorization check per folder
        $allowed = match ($folder) {
            'products' => $this->authorization->can($user, 'product.image.upload'),
            'brands' => $this->authorization->can($user, 'brand.edit') || $this->authorization->can($user, 'brand.create'),
            'categories' => $this->authorization->can($user, 'category.edit') || $this->authorization->can($user, 'category.create'),
            'banners' => $this->authorization->can($user, 'homepage.banner.edit'),
            default => false,
        };

        if (!$allowed) {
            return $this->forbidden("Forbidden: insufficient permission to upload media to '{$folder}'.");
        }

        try {
            $result = $this->imagePipeline->processAndStore($file, $folder);
            return $this->success($result, 'File uploaded successfully', 201);
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\RuntimeException $e) {
            return $this->serverError($e->getMessage());
        } catch (\Throwable $e) {
            return $this->serverError('Image processing failed: ' . $e->getMessage());
        }
    }
}
