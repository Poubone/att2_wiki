import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { humanize } from "../lib/items";

export type FiltersState = {
  search: string;
  rarity: string;
  boss: string;
  zone: string;
  sortDir: "asc" | "desc";
};

export type BossOption = { id: string; label: string };

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
  bosses: BossOption[];
  summary: string;
}) {
  const { t } = useTranslation();
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
        <label className="md:col-span-4">
          <div className="mb-1 text-sm uppercase tracking-wider text-muted-foreground">{t("filters.search")}</div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              value={value.search}
              onChange={onInput("search")}
              type="search"
              placeholder={t("filters.searchPlaceholder")}
              className="w-full pl-10 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground text-lg h-12 outline-none focus:border-primary"
            />
          </div>
        </label>

        <label className="md:col-span-2">
          <div className="mb-1 text-sm uppercase tracking-wider text-muted-foreground">{t("filters.rarity")}</div>
          <select
            value={value.rarity}
            onChange={onInput("rarity")}
            className="w-full bg-input border-2 border-border text-foreground px-3 py-2 text-base outline-none focus:border-primary"
          >
            <option value="">{t("filters.all")}</option>
            {rarities.map((r) => (
              <option key={r} value={r}>
                {humanize(r)}
              </option>
            ))}
          </select>
        </label>

        <label className="md:col-span-2">
          <div className="mb-1 text-sm uppercase tracking-wider text-muted-foreground">{t("common.boss")}</div>
          <select
            value={value.boss}
            onChange={onInput("boss")}
            className="w-full bg-input border-2 border-border text-foreground px-3 py-2 text-base outline-none focus:border-primary"
          >
            <option value="">{t("filters.allBosses")}</option>
            {bosses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>

        <label className="md:col-span-2">
          <div className="mb-1 text-sm uppercase tracking-wider text-muted-foreground">{t("filters.zone")}</div>
          <select
            value={value.zone}
            onChange={onInput("zone")}
            className="w-full bg-input border-2 border-border text-foreground px-3 py-2 text-base outline-none focus:border-primary"
          >
            <option value="">{t("filters.allZones")}</option>
            <option value="1">{t("filters.zoneN", { n: 1 })}</option>
            <option value="2">{t("filters.zoneN", { n: 2 })}</option>
            <option value="3">{t("filters.zoneN", { n: 3 })}</option>
            <option value="4">{t("filters.zoneN", { n: 4 })}</option>
          </select>
        </label>

        <label className="md:col-span-2">
          <div className="mb-1 text-sm uppercase tracking-wider text-muted-foreground">{t("filters.order")}</div>
          <select
            value={value.sortDir}
            onChange={onInput("sortDir")}
            className="w-full bg-input border-2 border-border text-foreground px-3 py-2 text-base outline-none focus:border-primary"
          >
            <option value="desc">{t("filters.orderRarityDesc")}</option>
            <option value="asc">{t("filters.orderRarityAsc")}</option>
          </select>
        </label>

        <div className="md:col-span-7">
          <div className="mt-6 text-lg text-muted-foreground">{summary}</div>
        </div>
      </div>
    </div>
  );
}

