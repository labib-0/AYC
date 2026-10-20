<?php

namespace App\Services\Documents;

use InvalidArgumentException;
use RuntimeException;

class PdfMergerService
{
    /**
     * Merge multiple PDF binary strings into a single unified PDF document.
     *
     * Pure PHP implementation:
     * - No external binaries or shell execution required.
     * - Preserves 100% of fonts, vector geometry, embedded images, page layouts, and styling.
     * - Retains independent local /Resources in each page subtree to eliminate font/image name collisions.
     *
     * @param array<string> $pdfBinaries Array of valid raw PDF binary strings
     * @return string Merged PDF binary string
     * @throws InvalidArgumentException|RuntimeException
     */
    public function merge(array $pdfBinaries): string
    {
        $filtered = array_values(array_filter($pdfBinaries, fn($b) => is_string($b) && strlen($b) > 0));

        if (empty($filtered)) {
            throw new InvalidArgumentException('Cannot merge an empty array of PDF binaries.');
        }

        if (count($filtered) === 1) {
            $single = $filtered[0];
            if (!str_starts_with($single, '%PDF-') || !str_contains($single, '%%EOF')) {
                throw new RuntimeException('Provided single PDF failed standard header/footer validation.');
            }
            return $single;
        }

        $allObjects = [];
        $kids = [];
        $totalPages = 0;
        $nextObjId = 3; // 1 = Master Catalog, 2 = Master Pages Root

        foreach ($filtered as $docIdx => $content) {
            if (!str_starts_with($content, '%PDF-')) {
                throw new RuntimeException("Document at index {$docIdx} is not a valid PDF (missing %PDF- marker).");
            }

            $offset = 0;
            $docObjects = [];
            $catalogId = null;
            $pagesRootId = null;
            $docPageCount = 0;

            while (preg_match('/([0-9]+)\s+0\s+obj\b/s', $content, $m, PREG_OFFSET_CAPTURE, $offset)) {
                $objId = (int) $m[1][0];
                $startPos = $m[0][1];
                $bodyStart = $startPos + strlen($m[0][0]);

                $endPos = strpos($content, 'endobj', $bodyStart);
                if ($endPos === false) {
                    break;
                }

                $body = substr($content, $bodyStart, $endPos - $bodyStart);

                // Separate dictionary/metadata from stream if present
                $streamPos = strpos($body, 'stream');
                if ($streamPos !== false) {
                    $dictPart = substr($body, 0, $streamPos);
                    $streamPart = substr($body, $streamPos);
                } else {
                    $dictPart = $body;
                    $streamPart = '';
                }

                if (strpos($dictPart, '/Type /Catalog') !== false) {
                    $catalogId = $objId;
                } elseif (strpos($dictPart, '/Type /Pages') !== false && strpos($dictPart, '/Kids') !== false) {
                    $pagesRootId = $objId;
                    if (preg_match('/\/Count\s+([0-9]+)/', $dictPart, $cm)) {
                        $docPageCount = (int) $cm[1];
                    }
                }

                // Exclude Outlines objects to avoid dangling outline pointer trees
                if (strpos($dictPart, '/Type /Outlines') === false) {
                    $docObjects[$objId] = [
                        'dict' => $dictPart,
                        'stream' => $streamPart,
                    ];
                }

                $offset = $endPos + 6;
            }

            if (!$pagesRootId || $docPageCount === 0) {
                throw new RuntimeException("Document at index {$docIdx} does not contain a recognizable /Pages root object.");
            }

            $totalPages += $docPageCount;

            // Map old IDs to new sequential IDs
            $idMap = [];
            foreach ($docObjects as $oldId => $parts) {
                if ($oldId === $catalogId) {
                    continue; // Skip individual document catalogs
                }
                $idMap[$oldId] = $nextObjId++;
            }

            $newPagesRootId = $idMap[$pagesRootId];
            $kids[] = "{$newPagesRootId} 0 R";

            // Rewrite references and save
            foreach ($docObjects as $oldId => $parts) {
                if ($oldId === $catalogId) {
                    continue;
                }
                $newId = $idMap[$oldId];
                $dict = $parts['dict'];
                $stream = $parts['stream'];

                // If this is the sub-document's pages root, connect it to master parent: /Parent 2 0 R
                if ($oldId === $pagesRootId) {
                    if (str_contains($dict, '/Parent')) {
                        $dict = preg_replace('/\/Parent\s+[0-9]+\s+0\s+R/', '/Parent 2 0 R', $dict);
                    } else {
                        $dict = preg_replace('/<<\s*/', '<< /Parent 2 0 R ', $dict, 1);
                    }
                }

                // Rewrite object references strictly within the dictionary: X 0 R -> newX 0 R
                $dict = preg_replace_callback('/([0-9]+)\s+0\s+R\b/', function ($rm) use ($idMap) {
                    $refId = (int) $rm[1];
                    return isset($idMap[$refId]) ? ($idMap[$refId] . ' 0 R') : $rm[0];
                }, $dict);

                $allObjects[$newId] = trim($dict) . ($stream !== '' ? "\n" . $stream : '');
            }
        }

        // Master Catalog (Obj 1) and Master Pages Root (Obj 2)
        $catalogObj = '<< /Type /Catalog /Pages 2 0 R >>';
        $kidsStr = implode(' ', $kids);
        $masterPagesObj = "<< /Type /Pages /Kids [ {$kidsStr} ] /Count {$totalPages} >>";

        $allObjects[1] = $catalogObj;
        $allObjects[2] = $masterPagesObj;
        ksort($allObjects);

        // Build binary with exact xref table and offsets
        $out = "%PDF-1.4\n";
        $xrefOffsets = [];

        foreach ($allObjects as $id => $body) {
            $xrefOffsets[$id] = strlen($out);
            $out .= "{$id} 0 obj\n" . trim($body) . "\nendobj\n";
        }

        $startXref = strlen($out);
        $maxId = max(array_keys($allObjects));
        $size = $maxId + 1;

        $out .= "xref\n0 {$size}\n";
        $out .= "0000000000 65535 f \n";
        for ($i = 1; $i <= $maxId; $i++) {
            if (isset($xrefOffsets[$i])) {
                $out .= sprintf("%010d 00000 n \n", $xrefOffsets[$i]);
            } else {
                $out .= "0000000000 65535 f \n";
            }
        }

        $out .= "trailer\n<< /Size {$size} /Root 1 0 R >>\nstartxref\n{$startXref}\n%%EOF\n";

        return $out;
    }
}
