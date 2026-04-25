import os
import re
import json
from urllib.parse import urljoin

import requests


BASE_URL = "https://gorillamind.com"
PRODUCTS_API = f"{BASE_URL}/products.json?limit=250"
OUTPUT_DIR = "public/product_images"
OUTPUT_JSON = "src/data/scraped_products.json"


def sanitize_filename(name: str) -> str:
    name = re.sub(r"[\\/:*?\"<>|]", "_", name.strip())
    name = re.sub(r"\s+", " ", name)
    return name[:120] or "product"


res = requests.get(PRODUCTS_API, timeout=30)
res.raise_for_status()

products = res.json().get("products", [])

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)

saved = 0
saved_products = []
for product in products:
    title = (product.get("title") or "product").strip()
    images = product.get("images") or []
    if not images:
        continue

    img_url = images[0].get("src")
    if not img_url:
        continue

    img_url = urljoin(BASE_URL, img_url)

    try:
        img_data = requests.get(img_url, timeout=30).content
    except requests.RequestException:
        continue

    filename = sanitize_filename(title) + ".jpg"
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "wb") as f:
        f.write(img_data)

    variants = product.get("variants") or []
    first_variant = variants[0] if variants else {}
    saved_products.append(
        {
            "id": product.get("id"),
            "title": product.get("title"),
            "handle": product.get("handle"),
            "type": product.get("product_type"),
            "price": first_variant.get("price"),
        }
    )
    saved += 1

print(f"Saved {saved} images to {OUTPUT_DIR}/")

with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(saved_products, f, indent=2, ensure_ascii=False)

print(f"Saved {len(saved_products)} product records to {OUTPUT_JSON}")