"use server";

import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

export interface CheckoutLineInput {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  type: string;
}

export interface CheckoutResult {
  ok: boolean;
  orderId: string | null;
  message: string;
}

export interface CheckoutDetailsInput {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  country: string;
}

function isMissingRelationError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("does not exist") &&
    (normalized.includes("public.orders") ||
      normalized.includes('relation "orders"') ||
      normalized.includes("could not find the table 'orders'"))
  );
}

function isMissingCategoryColumnError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('column "category" does not exist');
}

function isMissingStockQtyColumnError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('column "stock_qty" does not exist');
}

function formatCheckoutError(message: string | undefined) {
  const raw = String(message || "").trim();

  if (!raw) {
    return "Unable to create order.";
  }

  if (isMissingRelationError(raw)) {
    return (
      "Store checkout tables are missing in Supabase. Run SQL migrations " +
      "`supabase/migrations/20260425183000_orders_checkout_contact_shipping.sql` and " +
      "`supabase/migrations/20260425184500_create_checkout_order_function.sql`, then try checkout again."
    );
  }

  if (raw.toLowerCase().includes("place_checkout_order")) {
    return (
      "Checkout function is missing in Supabase. Run SQL migration " +
      "`supabase/migrations/20260425184500_create_checkout_order_function.sql`."
    );
  }

  if (isMissingCategoryColumnError(raw)) {
    return (
      "Checkout function is out of date for your current store_items schema. Run SQL migration " +
      "`supabase/migrations/20260426110000_fix_checkout_function_store_items_category_agnostic.sql`, then try again."
    );
  }

  if (isMissingStockQtyColumnError(raw)) {
    return (
      "Checkout function is out of date for your current store_items schema. Run SQL migration " +
      "`supabase/migrations/20260426112000_fix_checkout_function_store_items_stock_column_agnostic.sql`, then try again."
    );
  }

  return raw;
}

function sanitizeDetails(details: CheckoutDetailsInput | null | undefined) {
  const value = details ?? ({} as CheckoutDetailsInput);
  return {
    fullName: String(value.fullName || "").trim(),
    email: String(value.email || "").trim().toLowerCase(),
    phone: String(value.phone || "").trim(),
    addressLine1: String(value.addressLine1 || "").trim(),
    city: String(value.city || "").trim(),
    postalCode: String(value.postalCode || "").trim(),
    country: String(value.country || "").trim(),
  };
}

function sanitizeLines(lines: CheckoutLineInput[]): CheckoutLineInput[] {
  return lines
    .map((line) => ({
      id: String(line.id || "").trim(),
      name: String(line.name || "").trim(),
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      type: String(line.type || "").trim() || "General",
    }))
    .filter(
      (line) =>
        line.id.length > 0 &&
        line.name.length > 0 &&
        Number.isFinite(line.quantity) &&
        line.quantity > 0 &&
        Number.isFinite(line.unitPrice) &&
        line.unitPrice >= 0,
    );
}

export async function createOrderAction(
  lines: CheckoutLineInput[],
  detailsInput: CheckoutDetailsInput,
): Promise<CheckoutResult> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      orderId: null,
      message: "Supabase client is not available.",
    };
  }

  const sanitized = sanitizeLines(lines);
  const details = sanitizeDetails(detailsInput);

  if (sanitized.length === 0) {
    return {
      ok: false,
      orderId: null,
      message: "Your cart is empty.",
    };
  }

  if (
    !details.fullName ||
    !details.email ||
    !details.phone ||
    !details.addressLine1 ||
    !details.city ||
    !details.postalCode ||
    !details.country
  ) {
    return {
      ok: false,
      orderId: null,
      message: "Please fill all required checkout fields.",
    };
  }

  const orderInsert = await supabase.rpc("place_checkout_order", {
    p_order_details: {
      fullName: details.fullName,
      email: details.email || user.email || "",
      phone: details.phone,
      addressLine1: details.addressLine1,
      city: details.city,
      postalCode: details.postalCode,
      country: details.country,
      addressLine2: "",
      state: "",
      notes: "",
    },
    p_line_items: sanitized,
  });

  if (orderInsert.error || !orderInsert.data) {
    return {
      ok: false,
      orderId: null,
      message: formatCheckoutError(orderInsert.error?.message),
    };
  }

  const orderId = typeof orderInsert.data === "string" ? orderInsert.data : String(orderInsert.data);

  return {
    ok: true,
    orderId,
    message: "Order saved successfully.",
  };
}
