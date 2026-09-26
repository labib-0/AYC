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
    /**
     * Upload a file and return a public URL.
     *
     * Accepted folders: products, brands, categories, banners
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file'   => ['required', 'file', 'image', 'mimes:jpeg,jpg,png,webp,gif,svg', 'max:10240'],
            'folder' => ['nullable', 'string', 'in:products,brands,categories,banners'],
        ]);

        $folder = $request->input('folder', 'products');
        $file   = $request->file('file');

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
