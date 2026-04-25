import { StorePageContent } from "@/components/StorePageContent";
import scrapedProductsCatalog from "@/data/scraped_products.json";
import { normalizeStoreCatalog } from "@/lib/store/catalog";

export const dynamic = "force-dynamic";

export default function StorePage() {
  const normalized = normalizeStoreCatalog(scrapedProductsCatalog);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Supplement & Equipment Store</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Catalog is loaded from src/data/scraped_products.json and can still be replaced with upload.
        </p>
      </div>

      <StorePageContent initialItems={normalized.items} initialWarnings={normalized.warnings} />
    </div>
  );
}
