<?php

namespace App\Services\Shipping;

use InvalidArgumentException;

class PackageCalculatorService
{
    /**
     * Standard dimensional unit conversion factors to meters (m)
     */
    public const DIMENSION_TO_METERS = [
        'cm' => 0.01,
        'm' => 1.0,
        'in' => 0.0254,
    ];

    /**
     * Valid dimension units
     */
    public const VALID_DIMENSION_UNITS = ['cm', 'in', 'm'];

    /**
     * Valid weight units
     */
    public const VALID_WEIGHT_UNITS = ['kg', 'lbs', 'g'];

    /**
     * Calculate single carton volume in Cubic Meters (CBM).
     */
    public static function calculateCartonCbm(
        float $length,
        float $width,
        float $height,
        string $unit = 'cm'
    ): float {
        $normalizedUnit = strtolower(trim($unit));
        if (!isset(self::DIMENSION_TO_METERS[$normalizedUnit])) {
            throw new InvalidArgumentException("Invalid dimension unit: '{$unit}'. Allowed: cm, in, m");
        }

        if ($length <= 0 || $width <= 0 || $height <= 0) {
            throw new InvalidArgumentException("Carton dimensions must be strictly positive numbers");
        }

        $factor = self::DIMENSION_TO_METERS[$normalizedUnit];
        $lengthMeters = $length * $factor;
        $widthMeters = $width * $factor;
        $heightMeters = $height * $factor;

        return round($lengthMeters * $widthMeters * $heightMeters, 6);
    }

    /**
     * Calculate total shipment volume in CBM across all cartons.
     * Example: 3 cartons of 60 x 40 x 30 cm = 0.60 * 0.40 * 0.30 * 3 = 0.216 CBM
     */
    public static function calculateTotalCbm(
        float $length,
        float $width,
        float $height,
        int $cartonCount,
        string $unit = 'cm'
    ): float {
        if ($cartonCount < 1) {
            throw new InvalidArgumentException("Carton count must be at least 1");
        }

        $cartonCbm = self::calculateCartonCbm($length, $width, $height, $unit);
        return round($cartonCbm * $cartonCount, 4);
    }

    /**
     * Validate an array of package profiles for consistency, bounds, and duplicates/overlaps.
     */
    public static function validateProfilesList(array $profiles): void
    {
        $seenExactQuantities = [];
        $ranges = [];

        foreach ($profiles as $index => $profile) {
            $rowNum = $index + 1;

            $qtyMin = (int) ($profile['package_quantity'] ?? $profile['min_quantity'] ?? 0);
            $qtyMax = isset($profile['quantity_max']) && $profile['quantity_max'] !== null 
                ? (int) $profile['quantity_max'] 
                : null;
            $cartonCount = (int) ($profile['carton_count'] ?? 1);
            $length = (float) ($profile['carton_length'] ?? 0);
            $width = (float) ($profile['carton_width'] ?? 0);
            $height = (float) ($profile['carton_height'] ?? 0);
            $dimUnit = strtolower(trim($profile['dimension_unit'] ?? 'cm'));
            $grossWeight = (float) ($profile['gross_weight'] ?? 0);
            $netWeight = isset($profile['net_weight']) && $profile['net_weight'] !== null 
                ? (float) $profile['net_weight'] 
                : null;
            $weightUnit = strtolower(trim($profile['weight_unit'] ?? 'kg'));

            if ($qtyMin <= 0) {
                throw new InvalidArgumentException("Package profile #{$rowNum}: Quantity must be greater than 0");
            }

            if ($qtyMax !== null && $qtyMax < $qtyMin) {
                throw new InvalidArgumentException("Package profile #{$rowNum}: Maximum quantity ({$qtyMax}) cannot be less than minimum quantity ({$qtyMin})");
            }

            if ($cartonCount < 1) {
                throw new InvalidArgumentException("Package profile #{$rowNum}: Carton count must be at least 1");
            }

            if ($length <= 0 || $width <= 0 || $height <= 0) {
                throw new InvalidArgumentException("Package profile #{$rowNum}: Carton length, width, and height must be greater than 0");
            }

            if (!in_array($dimUnit, self::VALID_DIMENSION_UNITS, true)) {
                throw new InvalidArgumentException("Package profile #{$rowNum}: Invalid dimension unit '{$dimUnit}'. Allowed: " . implode(', ', self::VALID_DIMENSION_UNITS));
            }

            if ($grossWeight <= 0) {
                throw new InvalidArgumentException("Package profile #{$rowNum}: Gross weight must be greater than 0");
            }

            if ($netWeight !== null) {
                if ($netWeight <= 0) {
                    throw new InvalidArgumentException("Package profile #{$rowNum}: Net weight must be greater than 0 if provided");
                }
                if ($netWeight > $grossWeight) {
                    throw new InvalidArgumentException("Package profile #{$rowNum}: Net weight ({$netWeight}) cannot exceed gross weight ({$grossWeight})");
                }
            }

            if (!in_array($weightUnit, self::VALID_WEIGHT_UNITS, true)) {
                throw new InvalidArgumentException("Package profile #{$rowNum}: Invalid weight unit '{$weightUnit}'. Allowed: " . implode(', ', self::VALID_WEIGHT_UNITS));
            }

            // Duplicate exact quantity check
            if ($qtyMax === null) {
                if (in_array($qtyMin, $seenExactQuantities, true)) {
                    throw new InvalidArgumentException("Duplicate shipping package profile found for exact quantity {$qtyMin} pcs");
                }
                $seenExactQuantities[] = $qtyMin;
            }

            // Range overlap check
            $effectiveMax = $qtyMax ?? $qtyMin;
            foreach ($ranges as [$existingMin, $existingMax, $existingRow]) {
                if ($qtyMin <= $existingMax && $effectiveMax >= $existingMin) {
                    throw new InvalidArgumentException("Package profile #{$rowNum} [{$qtyMin}-{$effectiveMax}] overlaps with profile #{$existingRow} [{$existingMin}-{$existingMax}]");
                }
            }
            $ranges[] = [$qtyMin, $effectiveMax, $rowNum];
        }
    }
}
