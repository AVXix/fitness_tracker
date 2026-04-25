export type StoreItemKind = "supplement" | "equipment";

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  category: string;
  kind: StoreItemKind;
  price: number;
  currency: string;
  imageUrl: string | null;
  brand: string | null;
  rating: number | null;
  inStock: boolean;
  stockCount: number | null;
  tags: string[];
}

export interface NormalizedStoreCatalog {
  items: StoreItem[];
  warnings: string[];
}

function sanitizeImageFilename(name: string): string {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => asString(entry)).filter((entry): entry is string => Boolean(entry));
  }

  const singleValue = asString(value);
  if (!singleValue) {
    return [];
  }

  if (singleValue.includes(",")) {
    return singleValue
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [singleValue];
}

function inferKind(category: string, name: string, tags: string[]): StoreItemKind {
  const haystack = `${category} ${name} ${tags.join(" ")}`.toLowerCase();
  const supplementHints = ["supplement", "protein", "creatine", "vitamin", "amino", "omega", "capsule", "powder"];

  if (supplementHints.some((hint) => haystack.includes(hint))) {
    return "supplement";
  }

  return "equipment";
}

function extractRawItems(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  const record = asRecord(data);
  if (!record) {
    return [];
  }

  const itemList = record.items ?? record.products ?? record.catalog ?? record.data;
  return Array.isArray(itemList) ? itemList : [];
}

function normalizeItem(value: unknown, index: number): StoreItem | null {
  const row = asRecord(value);
  if (!row) {
    return null;
  }

  const name =
    asString(row.name) ??
    asString(row.title) ??
    asString(row.product_name) ??
    asString(row.productName) ??
    asString(row.item_name);

  if (!name) {
    return null;
  }

  const category =
    asString(row.category) ??
    asString(row.type) ??
    asString(row.group) ??
    "General";

  const tags = asStringArray(row.tags ?? row.keywords ?? row.labels);
  const price = asNumber(row.price ?? row.priceUsd ?? row.cost ?? row.amount) ?? 0;
  const currency = asString(row.currency ?? row.currencyCode) ?? "USD";
  const stockCount = asNumber(row.stock ?? row.stockCount ?? row.quantity);
  const inStockByFlag = row.inStock === true || row.available === true;
  const inStock = typeof stockCount === "number" ? stockCount > 0 : inStockByFlag || row.inStock !== false;
  const ratingValue = asNumber(row.rating ?? row.avgRating ?? row.average_rating);
  const explicitImageUrl = asString(row.image ?? row.imageUrl ?? row.thumbnail);
  const localImageUrl = `/product_images/${sanitizeImageFilename(name)}.jpg`;

  return {
    id:
      asString(row.id) ??
      asString(row.sku) ??
      asString(row.productId) ??
      `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index + 1}`,
    name,
    description:
      asString(row.description) ??
      asString(row.details) ??
      asString(row.summary) ??
      "No description provided.",
    category,
    kind: inferKind(category, name, tags),
    price,
    currency,
    imageUrl: explicitImageUrl ?? localImageUrl,
    brand: asString(row.brand ?? row.vendor ?? row.manufacturer),
    rating: ratingValue === null ? null : Math.max(0, Math.min(5, ratingValue)),
    inStock,
    stockCount,
    tags,
  };
}

export function normalizeStoreCatalog(data: unknown): NormalizedStoreCatalog {
  const rawItems = extractRawItems(data);
  const items: StoreItem[] = [];

  for (const [index, entry] of rawItems.entries()) {
    const item = normalizeItem(entry, index);
    if (item) {
      items.push(item);
    }
  }

  const warnings: string[] = [];
  if (rawItems.length === 0) {
    warnings.push("No products found. Provide a JSON array or an object with items/products.");
  }

  if (rawItems.length > 0 && items.length === 0) {
    warnings.push("Products were found, but none matched required fields (name/title and optional price). ");
  }

  return { items, warnings };
}
