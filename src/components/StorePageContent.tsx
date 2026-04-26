"use client";

import { useEffect, useMemo, useState } from "react";
import { type StoreItem } from "@/lib/store/catalog";
import { createOrderAction, type CheckoutDetailsInput } from "@/app/actions/store-actions";

type SortOption = "featured" | "price-asc" | "price-desc";

interface StorePageContentProps {
  initialItems: StoreItem[];
  initialWarnings: string[];
}

const HIDDEN_TYPES = new Set(["beluga-bundle", "general", "gift cards", "insurance"]);
const CART_STORAGE_KEY = "fitnesstracker.store.cart";

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
  const [checkoutStatus, setCheckoutStatus] = useState<string>("");
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutDetails, setCheckoutDetails] = useState<CheckoutDetailsInput>({
    fullName: "",
    email: "",
    phone: "",
    addressLine1: "",
    city: "",
    postalCode: "",
    country: "",
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const normalized: Record<string, number> = {};

      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "number" && Number.isFinite(value) && value > 0) {
          normalized[key] = Math.floor(value);
        }
      }

      setCart(normalized);
    } catch {
      setCart({});
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

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
    let currency = "USD";

    for (const item of catalogItems) {
      const qty = cart[item.id] || 0;
      lineItems += qty;
      subtotal += qty * item.price;
      if (qty > 0) {
        currency = item.currency;
      }
    }

    return { lineItems, subtotal, currency };
  }, [cart, catalogItems]);

  const cartEntries = useMemo(() => {
    return catalogItems
      .map((item) => ({ item, qty: cart[item.id] || 0 }))
      .filter((entry) => entry.qty > 0);
  }, [cart, catalogItems]);

  const addToCart = (itemId: string) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
    setIsCartOpen(true);
  };

  const decreaseCartItem = (itemId: string) => {
    setCart((prev) => {
      const current = prev[itemId] || 0;
      if (current <= 1) {
        const rest = { ...prev };
        delete rest[itemId];
        return rest;
      }

      return {
        ...prev,
        [itemId]: current - 1,
      };
    });
  };

  const removeCartItem = (itemId: string) => {
    setCart((prev) => {
      const rest = { ...prev };
      delete rest[itemId];
      return rest;
    });
  };

  const clearCart = () => {
    setCart({});
    setCheckoutStatus("");
  };

  const placeOrder = async () => {
    if (cartEntries.length === 0 || isSavingOrder) {
      return;
    }

    setIsSavingOrder(true);
    setCheckoutStatus("");

    const lines = cartEntries.map(({ item, qty }) => ({
      id: item.id,
      name: item.name,
      quantity: qty,
      unitPrice: item.price,
      type: item.category || "General",
    }));

    try {
      const result = await createOrderAction(lines, checkoutDetails);
      if (!result.ok) {
        setCheckoutStatus(`Checkout failed: ${result.message}`);
        return;
      }

      setCheckoutStatus(`Order saved: ${result.orderId}`);
      setCart({});
      setCheckoutDetails((prev) => ({
        ...prev,
      }));
    } catch {
      setCheckoutStatus("Checkout failed: unexpected error.");
    } finally {
      setIsSavingOrder(false);
    }
  };

  const updateCheckoutField = (field: keyof CheckoutDetailsInput, value: string) => {
    setCheckoutDetails((prev) => ({
      ...prev,
      [field]: value,
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

        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="rounded-xl bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Cart ({cartSummary.lineItems}) - {formatCurrency(cartSummary.subtotal, cartSummary.currency)}
        </button>
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

      {isCartOpen && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close cart"
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsCartOpen(false)}
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900">Your Cart</h3>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700"
              >
                Close
              </button>
            </div>

            <p className="mb-4 text-sm text-zinc-700">
              {cartSummary.lineItems} items • {formatCurrency(cartSummary.subtotal, cartSummary.currency)}
            </p>

            <div className="mb-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">Checkout Details</h4>
              <p className="mt-1 text-xs text-zinc-600">Required: name, email, phone, address, city, postal code, country.</p>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <input
                value={checkoutDetails.fullName}
                onChange={(event) => updateCheckoutField("fullName", event.target.value)}
                placeholder="Full name"
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                value={checkoutDetails.email}
                onChange={(event) => updateCheckoutField("email", event.target.value)}
                placeholder="Email"
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                value={checkoutDetails.phone}
                onChange={(event) => updateCheckoutField("phone", event.target.value)}
                placeholder="Phone number"
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                value={checkoutDetails.addressLine1}
                onChange={(event) => updateCheckoutField("addressLine1", event.target.value)}
                placeholder="Address line 1"
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                value={checkoutDetails.city}
                onChange={(event) => updateCheckoutField("city", event.target.value)}
                placeholder="City"
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                value={checkoutDetails.postalCode}
                onChange={(event) => updateCheckoutField("postalCode", event.target.value)}
                placeholder="Postal code"
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                value={checkoutDetails.country}
                onChange={(event) => updateCheckoutField("country", event.target.value)}
                placeholder="Country"
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">Cart Items</h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={placeOrder}
                  disabled={cartEntries.length === 0 || isSavingOrder}
                  className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white transition-colors enabled:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {isSavingOrder ? "Saving..." : "Place Order"}
                </button>
                <button
                  type="button"
                  onClick={clearCart}
                  disabled={cartEntries.length === 0}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear cart
                </button>
              </div>
            </div>

            {checkoutStatus && <p className="mb-3 text-xs text-zinc-700">{checkoutStatus}</p>}

            {cartEntries.length === 0 ? (
              <p className="text-sm text-zinc-600">Your cart is empty.</p>
            ) : (
              <div className="space-y-3">
                {cartEntries.map(({ item, qty }) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">{item.name}</p>
                      <p className="text-xs text-zinc-600">
                        {formatCurrency(item.price, item.currency)} each • {formatCurrency(item.price * qty, item.currency)} total
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => decreaseCartItem(item.id)}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700"
                        aria-label={`Decrease ${item.name}`}
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm font-medium text-zinc-900">{qty}</span>
                      <button
                        type="button"
                        onClick={() => addToCart(item.id)}
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700"
                        aria-label={`Increase ${item.name}`}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCartItem(item.id)}
                        className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
