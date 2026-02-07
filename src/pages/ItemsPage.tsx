import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Book, Pickaxe } from "lucide-react";
import { FiltersBar, type FiltersState } from "../components/FiltersBar";
import { ItemCard } from "../components/ItemCard";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { Pagination } from "../components/Pagination";
import { loadItemsFile, sortItems } from "../lib/items";
import type { BossOption } from "../components/FiltersBar";
import type { EnrichedItem } from "../types";
import type { OriginsFile } from "../types";

function buildOptions(items: EnrichedItem[], origins: OriginsFile | null) {
  const rarities = new Set<string>();
  const types = new Set<string>();
  const weaponSubtypes = new Set<string>();
  for (const it of items) {
    if (it.rarity) rarities.add(it.rarity);
    if (it.typeKey) {
      types.add(it.typeKey);
      if (it.typeKey === "weapon" && it.weaponSubtype) {
        weaponSubtypes.add(it.weaponSubtype);
      }
    }
  }

  const bosses: BossOption[] = origins?.origins?.length
    ? origins.origins
        .map((o) => ({ id: o.id, label: o.label }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }))
    : Array.from(new Set(items.flatMap((it) => it.bosses)))
        .sort()
        .map((label) => ({ id: label, label }));

  return {
    rarities: Array.from(rarities).sort(),
    types: Array.from(types).sort(),
    weaponSubtypes: Array.from(weaponSubtypes).sort(),
    bosses,
  };
}

function normalize(s: string) {
  return (s || "").toLowerCase();
}

function applyFilters(
  items: EnrichedItem[],
  f: FiltersState,
  filterBossById: boolean,
  origins: OriginsFile | null
) {
  const q = normalize(f.search);
  const bossOrigin =
    filterBossById && f.boss && origins?.origins?.length
      ? origins.origins.find((o) => o.id === f.boss)
      : null;
  const bossItemKeys = bossOrigin?.item_keys ? new Set(bossOrigin.item_keys) : null;

  const zoneNum = f.zone ? parseInt(f.zone, 10) : 0;

  return items.filter((it) => {
    if (f.rarity && it.rarity !== f.rarity) return false;
    if (f.boss) {
      if (bossItemKeys) {
        if (!bossItemKeys.has(it.key)) return false;
      } else if (filterBossById) {
        if (!it.dropped_by_bosses?.includes(f.boss)) return false;
      } else {
        if (!it.bosses.includes(f.boss)) return false;
      }
    }
    if (zoneNum >= 1 && zoneNum <= 4) {
      const sources = it.sources || [];
      const hasZone = sources.some(
        (s) => typeof s === "object" && "zone" in s && s.zone === zoneNum
      );
      if (!hasZone) return false;
    }

    if (!q) return true;
    const disp = it.display || {};
    const lore = (disp.lore_plain || disp.lore_text || []).join(" ");
    const hay = `${it.labelName} ${it.item_id} ${lore}`;
    return normalize(hay).includes(q);
  });
}

export default function ItemsPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<EnrichedItem[]>([]);
  const [origins, setOrigins] = useState<OriginsFile | null>(null);

  const [filters, setFilters] = useState<FiltersState>({
    search: "",
    rarity: "",
    boss: "",
    zone: "",
    sortDir: "desc",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { items: loadedItems, origins: loadedOrigins } = await loadItemsFile();
        if (!mounted) return;
        setItems(loadedItems);
        setOrigins(loadedOrigins ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const options = useMemo(() => buildOptions(items, origins), [items, origins]);

  const filterBossById = !!origins?.origins?.length;
  const filtered = useMemo(
    () => applyFilters(items, filters, filterBossById, origins),
    [items, filters, filterBossById, origins]
  );
  const sorted = useMemo(
    () => sortItems(filtered, "rarity", filters.sortDir),
    [filtered, filters.sortDir]
  );

  // Réinitialiser la page à 1 quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.rarity, filters.boss, filters.zone, filters.sortDir]);

  // Calculer la pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = sorted.slice(startIndex, endIndex);

  // Ajuster la page courante si elle est hors limites
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const summary = loading
    ? t("common.loading")
    : error
      ? `${t("common.error")}: ${error || t("common.errorUnknown")}`
      : t("home.summary", { count: sorted.length, total: items.length });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-border bg-card sticky top-0 z-20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/20 border-4 border-primary flex items-center justify-center">
                <Book className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-minecraft text-accent">
                  {t("home.title")}
                </h1>
                <p className="text-lg text-muted-foreground flex items-center gap-2">
                  <Pickaxe className="w-4 h-4" />
                  {t("home.subtitle")}
                </p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Decorative bar */}
      <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Filters */}
          <FiltersBar
            value={filters}
            onChange={setFilters}
            rarities={options.rarities}
            bosses={options.bosses}
            summary={summary}
          />

          {/* Items Grid */}
          {!loading && !error && sorted.length > 0 ? (
            <>
              {filters.boss && (
                <div className="p-4 bg-primary/10 border-2 border-primary text-foreground rounded-sm">
                  <p className="text-sm font-medium text-primary mb-1">
                    {options.bosses.find((b) => b.id === filters.boss)?.label ?? filters.boss}
                  </p>
                  <p className="text-muted-foreground text-sm">{t("home.bossDropMechanic")}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedItems.map((it) => (
                  <ItemCard key={it.key} item={it} />
                ))}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={sorted.length}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </>
          ) : !loading && !error && sorted.length === 0 ? (
            <div className="text-center py-12 bg-card border-2 border-border p-8">
              <p className="text-xl text-muted-foreground">{t("home.noItems")}</p>
              <p className="text-muted-foreground mt-2">
                {t("home.noItemsHint")}
              </p>
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">{t("common.loading")}</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-card border-2 border-destructive p-8">
              <p className="text-xl text-destructive">
                {t("common.error")}: {error || t("common.errorUnknown")}
              </p>
            </div>
          ) : null}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-muted-foreground">{t("home.footer")}</p>
        </div>
      </footer>
    </div>
  );
}

