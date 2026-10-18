import json
import subprocess
import sys

def run_query(sql):
    cmd = f"""su - postgres -c "psql -d ayaan_production -t -A -F'|' -c \\"{sql}\\"" """
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Query error: {res.stderr}", file=sys.stderr)
        return []
    lines = [l.strip() for l in res.stdout.strip().split("\n") if l.strip()]
    return [l.split("|") for l in lines]

print("Capturing production baseline inventory...")

# 1. Products inventory
prod_rows = run_query("SELECT id, name, sku, slug, brand_id, status FROM products ORDER BY id;")
products = [{"id": int(r[0]), "name": r[1], "sku": r[2], "slug": r[3], "brand_id": r[4], "status": r[5]} for r in prod_rows]

# 2. Brands inventory
brand_rows = run_query("SELECT id, name, slug, logo_url, is_active FROM brands ORDER BY id;")
brands = [{"id": int(r[0]), "name": r[1], "slug": r[2], "logo_url": r[3], "is_active": r[4]} for r in brand_rows]

# 3. Categories inventory
cat_rows = run_query("SELECT id, name, slug, image_url, is_active FROM categories ORDER BY id;")
categories = [{"id": int(r[0]), "name": r[1], "slug": r[2], "image_url": r[3], "is_active": r[4]} for r in cat_rows]

# 4. Product Images (galleries) inventory
img_rows = run_query("SELECT id, product_id, image_url, sort_order, is_primary FROM product_images ORDER BY product_id, sort_order, id;")
product_images = [{
    "id": int(r[0]),
    "product_id": int(r[1]),
    "image_url": r[2],
    "sort_order": int(r[3]),
    "is_primary": r[4] == "t"
} for r in img_rows]

# 5. Homepage Banners inventory
banner_rows = run_query("SELECT id, headline, image_url, is_active FROM homepage_banners ORDER BY id;")
banners = [{"id": int(r[0]), "headline": r[1], "image_url": r[2], "is_active": r[3]} for r in banner_rows]

# 6. Orders & Quotations with image URLs
order_item_rows = run_query("SELECT id, order_id, product_name, product_image_url FROM order_items WHERE product_image_url IS NOT NULL ORDER BY id;")
order_items = [{"id": int(r[0]), "order_id": int(r[1]), "product_name": r[2], "product_image_url": r[3]} for r in order_item_rows]

inventory_data = {
    "summary": {
        "total_products": len(products),
        "total_brands": len(brands),
        "total_categories": len(categories),
        "total_product_images": len(product_images),
        "total_banners": len(banners),
        "total_order_items_with_images": len(order_items),
    },
    "products": products,
    "brands": brands,
    "categories": categories,
    "product_images": product_images,
    "homepage_banners": banners,
    "order_items": order_items,
}

out_path = "/tmp/ayaan_inventory_baseline.json"
with open(out_path, "w") as f:
    json.dump(inventory_data, f, indent=2)

print(f"Baseline saved to {out_path}:")
print(f"  Products:       {len(products)}")
print(f"  Brands:         {len(brands)}")
print(f"  Categories:     {len(categories)}")
print(f"  Product Images: {len(product_images)}")
print(f"  Banners:        {len(banners)}")
print(f"  Order Items:    {len(order_items)}")
