import os
import sys
import hashlib
import json
import struct
import subprocess
from collections import defaultdict

def get_image_info(filepath):
    try:
        size = os.path.getsize(filepath)
    except Exception:
        return None
    
    fmt = "unknown"
    width, height = 0, 0
    webp_type = None

    try:
        with open(filepath, "rb") as f:
            header = f.read(64)
            if header.startswith(b"\xff\xd8\xff"):
                fmt = "jpeg"
                f.seek(0)
                data = f.read()
                i = 2
                while i < len(data) - 9:
                    if data[i] == 0xff:
                        marker = data[i+1]
                        if marker in [0xc0, 0xc1, 0xc2]:
                            h, w = struct.unpack(">HH", data[i+5:i+9])
                            width, height = w, h
                            break
                        else:
                            length = struct.unpack(">H", data[i+2:i+4])[0]
                            i += 2 + length
                    else:
                        i += 1
            elif header.startswith(b"\x89PNG\r\n\x1a\n"):
                fmt = "png"
                if len(header) >= 24:
                    width, height = struct.unpack(">II", header[16:24])
            elif header.startswith(b"RIFF") and len(header) >= 12 and header[8:12] == b"WEBP":
                fmt = "webp"
                tag = header[12:16]
                if tag == b"VP8 ":
                    webp_type = "lossy (VP8)"
                    if len(header) >= 30:
                        w, h = struct.unpack("<HH", header[26:30])
                        width = w & 0x3fff
                        height = h & 0x3fff
                elif tag == b"VP8L":
                    webp_type = "lossless (VP8L)"
                    if len(header) >= 25:
                        b0, b1, b2, b3 = header[21:25]
                        width = 1 + (((b1 & 0x3f) << 8) | b0)
                        height = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
                elif tag == b"VP8X":
                    webp_type = "extended (VP8X)"
                    if len(header) >= 30:
                        w24 = header[24:27]
                        h24 = header[27:30]
                        width = 1 + struct.unpack("<I", w24 + b"\x00")[0]
                        height = 1 + struct.unpack("<I", h24 + b"\x00")[0]
            elif header.startswith(b"GIF87a") or header.startswith(b"GIF89a"):
                fmt = "gif"
                if len(header) >= 10:
                    width, height = struct.unpack("<HH", header[6:10])
            elif b"<svg" in header.lower() or filepath.endswith(".svg"):
                fmt = "svg"
            elif header.startswith(b"%PDF"):
                fmt = "pdf"
    except Exception:
        pass

    # hash
    h = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            while True:
                chunk = f.read(65536)
                if not chunk:
                    break
                h.update(chunk)
        sha = h.hexdigest()
    except Exception:
        sha = ""

    return {
        "path": filepath,
        "size": size,
        "ext": os.path.splitext(filepath)[1].lower(),
        "format": fmt,
        "webp_type": webp_type,
        "width": width,
        "height": height,
        "sha256": sha
    }

STORAGE_ROOT = "/var/www/ayaan/backend/storage/app/public"
print(f"Scanning {STORAGE_ROOT} ...")

files_data = []
for root, dirs, files in os.walk(STORAGE_ROOT):
    for fn in files:
        fp = os.path.join(root, fn)
        info = get_image_info(fp)
        if info:
            info["relpath"] = os.path.relpath(fp, STORAGE_ROOT)
            files_data.append(info)

print(f"Total files in public storage: {len(files_data)}")
total_bytes = sum(f["size"] for f in files_data)
print(f"Total size: {total_bytes / (1024*1024):.2f} MB ({total_bytes} bytes)")

# Group by actual format
by_fmt = defaultdict(lambda: {"count": 0, "bytes": 0})
for f in files_data:
    by_fmt[f["format"]]["count"] += 1
    by_fmt[f["format"]]["bytes"] += f["size"]

print("\n--- Storage by True File Format (Sniffed Magic Bytes) ---")
for fmt, data in sorted(by_fmt.items(), key=lambda x: x[1]["bytes"], reverse=True):
    print(f"  {fmt:10s}: {data['count']:5d} files, {data['bytes'] / (1024*1024):8.2f} MB")

# Group by extension
by_ext = defaultdict(lambda: {"count": 0, "bytes": 0})
for f in files_data:
    by_ext[f["ext"]]["count"] += 1
    by_ext[f["ext"]]["bytes"] += f["size"]

print("\n--- Storage by Extension ---")
for ext, data in sorted(by_ext.items(), key=lambda x: x[1]["bytes"], reverse=True):
    print(f"  {ext:10s}: {data['count']:5d} files, {data['bytes'] / (1024*1024):8.2f} MB")

# WebP types breakdown
webp_types = defaultdict(lambda: {"count": 0, "bytes": 0})
for f in files_data:
    if f["format"] == "webp":
        t = f["webp_type"] or "unknown"
        webp_types[t]["count"] += 1
        webp_types[t]["bytes"] += f["size"]

print("\n--- WebP Encoding Breakdown ---")
for wt, data in sorted(webp_types.items(), key=lambda x: x[1]["bytes"], reverse=True):
    print(f"  {wt:20s}: {data['count']:5d} files, {data['bytes'] / (1024*1024):8.2f} MB")

# Check for duplicates by sha256
by_hash = defaultdict(list)
for f in files_data:
    if f["sha256"]:
        by_hash[f["sha256"]].append(f)

dup_hashes = {k: v for k, v in by_hash.items() if len(v) > 1}
dup_files_count = sum(len(v) - 1 for v in dup_hashes.values())
dup_wasted_bytes = sum((len(v) - 1) * v[0]["size"] for v in dup_hashes.values())
print(f"\n--- Duplicates by SHA-256 ---")
print(f"  Unique duplicate content groups: {len(dup_hashes)}")
print(f"  Redundant duplicate files:       {dup_files_count}")
print(f"  Recoverable duplicate space:     {dup_wasted_bytes / (1024*1024):.2f} MB")

# Check paired files: foo.jpg / foo.png AND foo.webp in same directory
by_stem = defaultdict(list)
for f in files_data:
    stem, _ = os.path.splitext(f["path"])
    by_stem[stem].append(f)

paired = {k: v for k, v in by_stem.items() if len(v) > 1}
print(f"\n--- Co-existing Basenames (e.g., both .jpg and .webp) ---")
print(f"  Basename collision / pair groups: {len(paired)}")
for k, v in list(paired.items())[:10]:
    print(f"  Stem: {k}")
    for item in v:
        print(f"    - {item['ext']} ({item['size']/1024:.1f} KB, format={item['format']})")

# Dimension distribution
print("\n--- Top 15 Largest Files in Storage ---")
sorted_by_size = sorted(files_data, key=lambda x: x["size"], reverse=True)
for f in sorted_by_size[:15]:
    print(f"  {f['size'] / (1024*1024):6.2f} MB | {f['width']}x{f['height']} | {f['format']:6s} ({f['ext']}) | {f['relpath']}")

# Size ranges
size_brackets = [
    ("< 50 KB", 0, 50*1024),
    ("50 - 200 KB", 50*1024, 200*1024),
    ("200 - 500 KB", 200*1024, 500*1024),
    ("500 KB - 1 MB", 500*1024, 1024*1024),
    ("1 - 2 MB", 1024*1024, 2*1024*1024),
    ("> 2 MB", 2*1024*1024, float("inf")),
]
print("\n--- File Size Distribution ---")
for label, low, high in size_brackets:
    matching = [f for f in files_data if low <= f["size"] < high]
    m_bytes = sum(f["size"] for f in matching)
    print(f"  {label:15s}: {len(matching):5d} files ({m_bytes / (1024*1024):8.2f} MB)")

# Query DB references
db_cmd = """su - postgres -c "psql -d ayaan_production -t -A -F'|' -c \\"
SELECT 'product_images', image_url FROM product_images
UNION ALL
SELECT 'brands', logo_url FROM brands WHERE logo_url IS NOT NULL
UNION ALL
SELECT 'categories', image_url FROM categories WHERE image_url IS NOT NULL
UNION ALL
SELECT 'homepage_banners', image_url FROM homepage_banners WHERE image_url IS NOT NULL;
\\"" """

res = subprocess.run(db_cmd, shell=True, capture_output=True, text=True)
db_urls = []
for line in res.stdout.strip().split("\n"):
    if line.strip():
        parts = line.split("|")
        if len(parts) >= 2:
            db_urls.append({"source": parts[0], "url": parts[1]})

print(f"\n--- Database Reference Cross-Check ---")
print(f"  Total DB image references found: {len(db_urls)}")

db_by_ext = defaultdict(int)
for u in db_urls:
    ext = os.path.splitext(u["url"])[1].lower()
    db_by_ext[ext] += 1
print("  DB references by extension:")
for ext, cnt in sorted(db_by_ext.items(), key=lambda x: x[1], reverse=True):
    print(f"    {ext:10s}: {cnt:5d}")

ref_relpaths = set()
for u in db_urls:
    url = u["url"]
    if "/storage/" in url:
        rel = url.split("/storage/", 1)[1]
        ref_relpaths.add(rel.lstrip("/"))
    elif url.startswith("products/") or url.startswith("brands/") or url.startswith("categories/") or url.startswith("banners/"):
        ref_relpaths.add(url.lstrip("/"))

print(f"  Unique relative paths extracted from DB: {len(ref_relpaths)}")

matched = 0
unmatched_db = []
for rel in ref_relpaths:
    full = os.path.join(STORAGE_ROOT, rel)
    if os.path.exists(full):
        matched += 1
    else:
        unmatched_db.append(rel)

print(f"  DB references that exist on disk:     {matched} / {len(ref_relpaths)}")
if unmatched_db:
    print(f"  DB references NOT found on disk:     {len(unmatched_db)}")
    for m in unmatched_db[:5]:
        print(f"    MISSING: {m}")

# Disk files referenced vs orphaned
disk_relpaths = {f["relpath"] for f in files_data}
orphaned = disk_relpaths - ref_relpaths
orphaned_bytes = sum(f["size"] for f in files_data if f["relpath"] in orphaned)
print(f"  Disk files matching DB references:   {len(disk_relpaths - orphaned)}")
print(f"  Disk files NOT referenced in DB:     {len(orphaned)} files, {orphaned_bytes / (1024*1024):.2f} MB")

with open("/tmp/audit_media_summary.json", "w") as out:
    json.dump({
        "total_files": len(files_data),
        "total_bytes": total_bytes,
        "by_format": dict(by_fmt),
        "by_extension": dict(by_ext),
        "webp_types": dict(webp_types),
        "duplicate_groups": len(dup_hashes),
        "duplicate_files": dup_files_count,
        "duplicate_wasted_bytes": dup_wasted_bytes,
        "orphaned_files": len(orphaned),
        "orphaned_bytes": orphaned_bytes,
        "top_largest": sorted_by_size[:30]
    }, out, indent=2)

print("\nAudit written to /tmp/audit_media_summary.json successfully.")
