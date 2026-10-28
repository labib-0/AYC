<?php

namespace App\Http\Requests\Admin;

use App\Models\CmsPage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCmsPageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'title'                  => ['required', 'string', 'max:255'],
            'slug'                   => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::notIn(CmsPage::RESERVED_SLUGS),
                Rule::unique('cms_pages', 'slug'),
            ],
            'status'                 => ['nullable', 'string', 'in:draft,published,archived'],
            'sections'               => ['nullable', 'array'],
            'draft_sections'         => ['nullable', 'array'],
            'parent_id'              => ['nullable', 'integer', 'exists:cms_pages,id'],
            'breadcrumb_label'       => ['nullable', 'string', 'max:100'],
            'show_in_footer'         => ['nullable', 'boolean'],
            'footer_label'           => ['nullable', 'string', 'max:100'],
            'footer_sort_order'      => ['nullable', 'integer', 'min:0'],
            'meta_title'             => ['nullable', 'string', 'max:255'],
            'meta_description'       => ['nullable', 'string', 'max:1000'],
            'canonical_url'          => ['nullable', 'string', 'max:500'],
            'og_image_url'           => ['nullable', 'string', 'max:500'],
            'is_indexable'           => ['nullable', 'boolean'],
            'scheduled_publish_at'   => ['nullable', 'date'],
            'scheduled_unpublish_at' => ['nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Page title is required.',
            'slug.required'  => 'URL slug is required.',
            'slug.regex'     => 'URL slug must be lowercase alphanumeric and hyphens only (e.g. about-us).',
            'slug.not_in'    => 'The slug ":input" is reserved for a core application route.',
            'slug.unique'    => 'The slug ":input" is already in use by another page.',
        ];
    }
}

