#!/usr/bin/env python3
"""
Ayaan Clothing — Favicon & Web Icon Generation Pipeline
Authoritative conversion tool generating standard multi-resolution favicon.ico
and PNG icon assets directly from the official website logo: public/logo.png
"""

import os
import hashlib
from PIL import Image

def generate_icons():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logo_path = os.path.join(root_dir, "public", "logo.png")

    if not os.path.exists(logo_path):
        raise FileNotFoundError(f"Missing authoritative logo at {logo_path}")

    with open(logo_path, "rb") as f:
        orig_hash = hashlib.sha256(f.read()).hexdigest()

    print(f"Loading authoritative source logo: {logo_path}")
    orig = Image.open(logo_path)
    print(f"Original dimensions: {orig.size}, format: {orig.format}, mode: {orig.mode}")

    # Extract non-transparent emblem content
    bbox = orig.getbbox()
    content = orig.crop(bbox)
    cw, ch = content.size
    print(f"Extracted emblem bounding box: {bbox} (content size: {cw}x{ch})")

    # Construct high-resolution 512x512 master square canvas with balanced ~5% breathing margin
    master_dim = 512
    target_cw = 460
    target_ch = int(ch * (target_cw / cw))
    scaled_content = content.resize((target_cw, target_ch), Image.Resampling.LANCZOS)

    master = Image.new("RGBA", (master_dim, master_dim), (0, 0, 0, 0))
    ox = (master_dim - target_cw) // 2
    oy = (master_dim - target_ch) // 2
    master.paste(scaled_content, (ox, oy), scaled_content)

    # Standard PNG web icons
    png_targets = {
        os.path.join(root_dir, "public", "icon-48x48.png"): 48,
        os.path.join(root_dir, "public", "icon-96x96.png"): 96,
        os.path.join(root_dir, "public", "apple-touch-icon.png"): 180,
        os.path.join(root_dir, "public", "icon-192x192.png"): 192,
        os.path.join(root_dir, "public", "icon-256x256.png"): 256,
        os.path.join(root_dir, "public", "icon-512x512.png"): 512,
    }

    for path, size in png_targets.items():
        resized = master.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(path, "PNG", optimize=True)
        print(f"✔ Generated {os.path.relpath(path, root_dir)} ({size}x{size})")

    # Multi-resolution standard ICO files
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_targets = [
        os.path.join(root_dir, "public", "favicon.ico"),
        os.path.join(root_dir, "src", "app", "favicon.ico"),
    ]

    for ico_path in ico_targets:
        master.save(ico_path, format="ICO", sizes=ico_sizes)
        print(f"✔ Generated {os.path.relpath(ico_path, root_dir)} with standard sizes {ico_sizes}")

    # Verify logo integrity
    with open(logo_path, "rb") as f:
        post_hash = hashlib.sha256(f.read()).hexdigest()

    assert orig_hash == post_hash, "Integrity Error: public/logo.png was unexpectedly modified!"
    print("✔ Source logo public/logo.png verified 100% untouched.")

if __name__ == "__main__":
    generate_icons()
