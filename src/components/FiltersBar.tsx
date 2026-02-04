import type { ChangeEvent } from "react";
import { Search } from "lucide-react";
import { humanize } from "../lib/items";

export type FiltersState = {
  search: string;
  rarity: string;
  boss: string;
  sortKey: "name" | "rarity" | "sources" | "bosses";
  sortDir: "asc" | "desc";
};

export function FiltersBar({
  value,
  onChange,
  rarities,
  bosses,
  summary,
}: {
  value: FiltersState;
  onChange: (next: FiltersState) => void;
  rarities: string[];
  bosses: string[];
  summary: string;
}) {
  const update = (patch: Partial<FiltersState>) => onChange({ ...value, ...patch });

  const onInput =
    (key: keyof FiltersState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      update({ [key]: e.target.value } as Partial<FiltersState>);
    };

  return (
    <div className="space-y-4 p-4 bg-card border-2 border-border relative">
      {/* Filters bar */}
      {/* Pixel corners */}
      <div className="absolute top-0 left-0 w-3 h-3 bg-border" />
      <div className="absolute top-0 right-0 w-3 h-3 bg-border" />
      <div className="absolute bottom-0 left-0 w-3 h-3 bg-border" />
      <div className="absolute bottom-0 right-0 w-3 h-3 bg-border" />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <label className="md:col-span-5">
          <div className="mb-1 text-sm uppercase tracking-wider text-muted-foreground">Recherche</div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              value={value.search}
              onChange={onInput("search")}
              type="search"
              placeholder="Rechercher un item..."
              className="w-full pl-10 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground text-lg h-12 outline-none focus:border-primary"
            />
          </div>
        </label>

        <label className="md:col-span-2">
          <div className="mb-1 text-sm uppercase tracking-wider text-muted-foreground">Rareté</div>
          <select
            value={value.rarity}
            onChange={onInput("rarity")}
            className="w-full bg-input border-2 border-border text-foreground px-3 py-2 text-base outline-none focus:border-primary"
          >
            <option value="">Toutes</option>
            {rarities.map((r) => (
              <option key={r} value={r}>
                {humanize(r)}
              </option>
            ))}
          </select>
        </label>

        <label className="md:col-span-2">
          <div className="mb-1 text-sm uppercase tracking-wider text-muted-foreground">Boss</div>
          <select
            value={value.boss}
            onChange={onInput("boss")}
            className="w-full bg-input border-2 border-border text-foreground px-3 py-2 text-base outline-none focus:border-primary"
          >
            <option value="">Tous</option>
            {bosses.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        <label className="md:col-span-3">
          <div className="mb-1 text-sm uppercase tracking-wider text-muted-foreground">Trier par</div>
          <select
            value={value.sortKey}
            onChange={onInput("sortKey")}
            className="w-full bg-input border-2 border-border text-foreground px-3 py-2 text-base outline-none focus:border-primary"
          >
            <option value="name">Nom</option>
            <option value="rarity">Rareté</option>
            <option value="sources">Nb de sources</option>
            <option value="bosses">Nb de boss</option>
          </select>
        </label>

        <label className="md:col-span-2">
          <div className="mb-1 text-sm uppercase tracking-wider text-muted-foreground">Ordre</div>
          <select
            value={value.sortDir}
            onChange={onInput("sortDir")}
            className="w-full bg-input border-2 border-border text-foreground px-3 py-2 text-base outline-none focus:border-primary"
          >
            <option value="asc">Ascendant</option>
            <option value="desc">Descendant</option>
          </select>
        </label>

        <div className="md:col-span-7">
          <div className="mt-6 text-lg text-muted-foreground">{summary}</div>
        </div>
      </div>
    </div>
  );
}

