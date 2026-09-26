<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\Api\V1\ActivityResource;
use App\Models\Activity;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityController extends ApiController
{
    /**
     * GET /api/v1/admin/activities
     * List audit trail activities with composable filtering.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Activity::with('user')->orderBy('created_at', 'desc');

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        if ($request->filled('subject_type')) {
            $type = $request->input('subject_type');
            $query->where(function ($q) use ($type) {
                $q->where('subject_type', $type)
                  ->orWhere('subject_type', 'like', "%\\{$type}");
            });
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        if ($request->filled('from_date')) {
            $query->where('created_at', '>=', Carbon::parse($request->input('from_date'))->startOfDay());
        }

        if ($request->filled('to_date')) {
            $query->where('created_at', '<=', Carbon::parse($request->input('to_date'))->endOfDay());
        }

        $perPage = min((int) $request->input('per_page', 25), 100);
        $activities = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Activity logs retrieved',
            'data' => ActivityResource::collection($activities)->resolve(),
            'links' => [
                'first' => $activities->url(1),
                'last' => $activities->url($activities->lastPage()),
                'prev' => $activities->previousPageUrl(),
                'next' => $activities->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $activities->currentPage(),
                'from' => $activities->firstItem(),
                'last_page' => $activities->lastPage(),
                'per_page' => $activities->perPage(),
                'to' => $activities->lastItem(),
                'total' => $activities->total(),
            ],
        ]);
    }
}
