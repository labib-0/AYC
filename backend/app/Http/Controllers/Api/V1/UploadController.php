<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * General-purpose file upload controller.
 * Handles product images, brand logos, banners, and other admin media.
 *
 * POST /api/v1/upload
 * Auth: Bearer token (admin required)
 */
class UploadController extends ApiController
{
    public function __construct(
        private readonly \App\Services\Rbac\AdminAuthorizationService $authorization
    ) {}

    /**
     * Upload a file and return a public URL.
     *
     * Accepted folders: products, brands, categories, banners
     */
    public function upload(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->isAdmin()) {
            return $this->forbidden('Administrator access required.');
        }

        $request->validate([
            'file'   => ['required', 'file', 'image', 'mimes:jpeg,jpg,png,webp,gif,svg', 'max:10240'],
            'folder' => ['nullable', 'string', 'in:products,brands,categories,banners'],
        ]);

        $folder = $request->input('folder', 'products');

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

        $file = $request->file('file');

        // Store in the public disk under the named subfolder
        $path = $file->store($folder, 'public');
        $url  = asset('storage/' . $path);

        return $this->success([
            'url'    => $url,
            'path'   => $path,
            'key'    => $path,
            'folder' => $folder,
            'name'   => $file->getClientOriginalName(),
            'size'   => $file->getSize(),
            'mime'   => $file->getMimeType(),
        ], 'File uploaded successfully', 201);
    }
}
