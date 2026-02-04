import { useEffect, useMemo, useState } from "react";
import { Book, Pickaxe } from "lucide-react";
import { FiltersBar, type FiltersState } from "../components/FiltersBar";
import { ItemCard } from "../components/ItemCard";
import { Pagination } from "../components/Pagination";
import { loadItemsFile, sortItems } from "../lib/items";
import type { EnrichedItem } from "../types";

function buildOptions(items: EnrichedItem[]) {
  const rarities = new Set<string>();
  const types = new Set<string>();
  const weaponSubtypes = new Set<string>();
  const bosses = new Set<string>();
  for (const it of items) {
    if (it.rarity) rarities.add(it.rarity);
    if (it.typeKey) {
      types.add(it.typeKey);
      // Si c'est une arme et qu'on a un sous-type, l'ajouter
      if (it.typeKey === "weapon" && it.weaponSubtype) {
        weaponSubtypes.add(it.weaponSubtype);
      }
    }
    for (const b of it.bosses) bosses.add(b);
  }
  return {
    rarities: Array.from(rarities).sort(),
    types: Array.from(types).sort(),
    weaponSubtypes: Array.from(weaponSubtypes).sort(),
    bosses: Array.from(bosses).sort(),
  };
}

function normalize(s: string) {
  return (s || "").toLowerCase();
}

function applyFilters(items: EnrichedItem[], f: FiltersState) {
  const q = normalize(f.search);
  return items.filter((it) => {
    if (f.rarity && it.rarity !== f.rarity) return false;
    if (f.boss && !it.bosses.includes(f.boss)) return false;

    if (!q) return true;
    const disp = it.display || {};
    const lore = (disp.lore_plain || disp.lore_text || []).join(" ");
    const hay = `${it.labelName} ${it.item_id} ${lore}`;
    return normalize(hay).includes(q);
  });
}

export default function ItemsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<EnrichedItem[]>([]);

  const [filters, setFilters] = useState<FiltersState>({
    search: "",
    rarity: "",
    boss: "",
    sortKey: "name",
    sortDir: "asc",
  });

  // S'assurer que sortKey est toujours valide (au cas où une valeur invalide serait stockée)
  useEffect(() => {
    const validSortKeys: FiltersState["sortKey"][] = ["name", "rarity", "sources", "bosses"];
    if (!validSortKeys.includes(filters.sortKey)) {
      setFilters(prev => ({ ...prev, sortKey: "name" }));
    }
  }, [filters.sortKey]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { items } = await loadItemsFile();
        if (!mounted) return;
        setItems(items);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erreur inconnue";
        setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const options = useMemo(() => buildOptions(items), [items]);

  const filtered = useMemo(() => applyFilters(items, filters), [items, filters]);
  const sorted = useMemo(() => {
    return sortItems(filtered, filters.sortKey, filters.sortDir);
  }, [filtered, filters.sortKey, filters.sortDir]);

  // Réinitialiser la page à 1 quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.rarity, filters.boss, filters.sortKey, filters.sortDir]);

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
    ? "Chargement…"
    : error
      ? `Erreur: ${error}`
      : `${sorted.length} objet(s) trouvé(s) sur ${items.length} total`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-border bg-card sticky top-0 z-20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/20 border-4 border-primary flex items-center justify-center">
              <Book className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-minecraft text-accent">
                Datapack Wiki
              </h1>
              <p className="text-lg text-muted-foreground flex items-center gap-2">
                <Pickaxe className="w-4 h-4" />
                Wiki des items d'Across the Time 2
              </p>
            </div>
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
              <p className="text-xl text-muted-foreground">Aucun item trouvé</p>
              <p className="text-muted-foreground mt-2">
                Essayez de modifier vos filtres de recherche
              </p>
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">Chargement…</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-card border-2 border-destructive p-8">
              <p className="text-xl text-destructive">Erreur: {error}</p>
            </div>
          ) : null}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-muted-foreground">
            Datapack Wiki • Fait par Poubone
          </p>
        </div>
      </footer>
    </div>
  );
}

