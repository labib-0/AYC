<?php

namespace App\Support;

/**
 * ReleaseIdentity
 *
 * Provides immutable, compile-time/boot-time release metadata baked into
 * the running application release.
 *
 * When PHP-FPM compiles this file into OPcache, class constants are
 * locked into shared memory bytecode. When a queue worker boots,
 * its identity is captured at bootstrap and locked into process memory.
 * Neither process resolves release identity through the mutable 'current'
 * symlink.
 */
class ReleaseIdentity
{
    public const COMMIT_SHA = '';
    public const RELEASE_ID = '';
    public const BUILD_ID = '';
    public const BUILT_AT = '';

    private static ?array $memoized = null;

    public static function commitSha(): ?string
    {
        return self::get()['commit_sha'];
    }

    public static function releaseId(): ?string
    {
        return self::get()['release_id'];
    }

    public static function buildId(): ?string
    {
        return self::get()['build_id'];
    }

    public static function builtAt(): ?string
    {
        return self::get()['built_at'];
    }

    /**
     * Get the immutable release identity loaded into this process.
     *
     * Evaluation order:
     * 1. Immutable class constants (compiled into OPcache bytecode during release build).
     * 2. Physical release directory metadata (__DIR__ resolved to the physical release tree).
     *    Never follows mutable /var/www/ayaan/current symlink.
     * 3. Fallback unversioned record.
     */
    public static function get(): array
    {
        if (self::$memoized !== null) {
            return self::$memoized;
        }

        // 1. Immutable baked constants (highest priority, compiled bytecode)
        if (self::COMMIT_SHA !== '' && self::RELEASE_ID !== '') {
            self::$memoized = [
                'commit_sha' => self::COMMIT_SHA,
                'release_id' => self::RELEASE_ID,
                'build_id' => self::BUILD_ID !== '' ? self::BUILD_ID : null,
                'built_at' => self::BUILT_AT !== '' ? self::BUILT_AT : null,
                'source' => 'compiled_constant',
            ];
            return self::$memoized;
        }

        // 2. Physical release directory lookups (__DIR__ resolves to the real release directory)
        // Note: Deliberately avoid base_path() or current/ symlinks here!
        $physicalBackendDir = dirname(__DIR__, 2);
        $candidates = [
            $physicalBackendDir . '/RELEASE_METADATA.json',
            dirname($physicalBackendDir) . '/RELEASE_METADATA.json',
        ];

        foreach ($candidates as $file) {
            if (is_file($file)) {
                $content = @file_get_contents($file);
                if ($content !== false) {
                    $json = json_decode($content, true);
                    if (is_array($json) && !empty($json['commit_sha'])) {
                        self::$memoized = [
                            'commit_sha' => (string) ($json['commit_sha'] ?? ''),
                            'release_id' => (string) ($json['release_id'] ?? ''),
                            'build_id' => !empty($json['build_id']) ? (string) $json['build_id'] : null,
                            'built_at' => !empty($json['deployed_at']) ? (string) $json['deployed_at'] : (!empty($json['created_at']) ? (string) $json['created_at'] : null),
                            'source' => 'physical_release_metadata',
                        ];
                        return self::$memoized;
                    }
                }
            }
        }

        // 3. Fallback for unversioned state
        self::$memoized = [
            'commit_sha' => null,
            'release_id' => null,
            'build_id' => null,
            'built_at' => null,
            'source' => 'unversioned',
        ];
        return self::$memoized;
    }

    /**
     * For isolated testing only: reset memoized state.
     */
    public static function resetForTesting(): void
    {
        self::$memoized = null;
    }
}

