import subprocess
import json

def run_query(sql):
    cmd = f"""su - postgres -c "psql -d ayaan_production -t -A -F'|' -c \\"{sql}\\"" """
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Query error: {res.stderr}")
        return []
    lines = [l.strip() for l in res.stdout.strip().split("\n") if l.strip()]
    return [l.split("|") for l in lines]

print("Checking non-WebP references in DB...")
tables = [
    ("product_images", "id", "image_url"),
    ("brands", "id", "logo_url"),
    ("categories", "id", "image_url"),
    ("homepage_banners", "id", "image_url"),
    ("order_items", "id", "product_image_url"),
]

for tbl, id_col, url_col in tables:
    sql = f"SELECT {id_col}, {url_col} FROM {tbl} WHERE {url_col} ~* '\\\\.(jpg|jpeg|png)$';"
    rows = run_query(sql)
    print(f"Table {tbl}: {len(rows)} non-WebP references")
    for r in rows[:5]:
        print(f"  [{r[0]}] {r[1]}")
