"use client";

import { useMemo, useState } from "react";
import { type StoreItem } from "@/lib/store/catalog";

type SortOption = "featured" | "price-asc" | "price-desc";

interface StorePageContentProps {
  initialItems: StoreItem[];
  initialWarnings: string[];
}

const HIDDEN_TYPES = new Set(["beluga-bundle", "general", "gift cards", "insurance"]);

function normalizeType(value: string): string {
  return value.trim().toLowerCase();
}

function formatCurrency(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `$${price.toFixed(2)}`;
  }
}

export function StorePageContent({ initialItems, initialWarnings }: StorePageContentProps) {
  const [catalogItems] = useState<StoreItem[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [cart, setCart] = useState<Record<string, number>>({});

  const storefrontItems = useMemo(() => {
    return catalogItems.filter((item) => !HIDDEN_TYPES.has(normalizeType(item.category || "")));
  }, [catalogItems]);

  const types = useMemo(() => {
    return [...new Set(storefrontItems.map((item) => item.category))].sort((a, b) => a.localeCompare(b));
  }, [storefrontItems]);

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = storefrontItems.filter((item) => {
      if (typeFilter !== "all" && item.category !== typeFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableText = `${item.name} ${item.description} ${item.category} ${item.brand || ""} ${item.tags.join(" ")}`.toLowerCase();
      return searchableText.includes(query);
    });

    if (sortBy === "price-asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      filtered.sort((a, b) => b.price - a.price);
    }

    return filtered;
  }, [storefrontItems, typeFilter, searchQuery, sortBy]);

  const cartSummary = useMemo(() => {
    let lineItems = 0;
    let subtotal = 0;

    for (const item of catalogItems) {
      const qty = cart[item.id] || 0;
      lineItems += qty;
      subtotal += qty * item.price;
    }

    return { lineItems, subtotal };
  }, [cart, catalogItems]);

  const addToCart = (itemId: string) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  return (
    <div className="space-y-6">
      {initialWarnings.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {initialWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search products or type"
          className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
        />

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="all">All Types</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type || "Uncategorized"}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortOption)}
          className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="featured">Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">Cart Summary</h3>
          <p className="text-sm text-zinc-700">
            {cartSummary.lineItems} items • {formatCurrency(cartSummary.subtotal, "USD")}
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-950">Catalog</h2>
          <p className="text-sm text-zinc-600">{visibleItems.length} products</p>
        </div>

        {visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 py-12 text-center">
            <p className="text-zinc-600">No products match your current filters.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => (
              <article key={item.id} className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                      {item.category || "item"}
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-zinc-900">{item.name}</h3>
                    <p className="text-sm font-semibold text-zinc-900">{formatCurrency(item.price, item.currency)}</p>
                  </div>

                  {item.brand && <p className="text-xs uppercase tracking-wider text-zinc-500">{item.brand}</p>}

                  <p className="text-sm text-zinc-600">{item.description}</p>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-700">{item.category || "Uncategorized"}</span>
                    {typeof item.rating === "number" && (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                        {item.rating.toFixed(1)} / 5
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className={`text-xs ${item.inStock ? "text-emerald-600" : "text-rose-600"}`}>
                    {item.inStock ? `In stock${typeof item.stockCount === "number" ? ` (${item.stockCount})` : ""}` : "Out of stock"}
                  </p>

                  <button
                    type="button"
                    onClick={() => addToCart(item.id)}
                    disabled={!item.inStock}
                    className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white transition-colors enabled:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                  >
                    Add to cart
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
