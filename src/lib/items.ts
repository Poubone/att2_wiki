import type { EnrichedItem, ItemRecord, ItemsFile, OriginsFile } from "../types";

function titleCaseWords(s: string) {
  return s
    .split("_")
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

export function humanize(s?: string | null) {
  if (!s) return "Inconnu";
  const str = String(s).replace(/_/g, " ");
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function extractBossesFromSources(sources?: Array<{ path: string; chance?: number }> | string[] | null) {
  if (!Array.isArray(sources)) return [];
  const bosses = new Set<string>();
  for (const src of sources) {
    // Gérer à la fois l'ancien format (string) et le nouveau (objet avec path)
    const path = typeof src === "string" ? src : src.path;
    if (!path.includes("entities/boss/")) continue;
    const parts = path.split("/");
    const bossIndex = parts.indexOf("boss");
    if (bossIndex === -1 || bossIndex + 1 >= parts.length) continue;
    let raw = parts[bossIndex + 1];
    if (raw === "dedicated" && bossIndex + 2 < parts.length) {
      raw = parts[bossIndex + 2];
    }
    raw = raw.replace(/\.json$/i, "");
    if (!raw) continue;
    bosses.add(titleCaseWords(raw));
  }
  return Array.from(bosses).sort();
}

/**
 * Détecte le type d'arme spécifique depuis l'item_id
 */
export function guessWeaponSubtype(item: ItemRecord): string | null {
  const id = item.item_id || "";
  const lower = id.toLowerCase();
  
  if (lower.includes("sword")) return "épée";
  if (lower.includes("axe") && !lower.includes("pickaxe")) return "hache";
  if (lower.includes("bow") || lower.includes("crossbow")) return "arc";
  if (lower.includes("trident")) return "trident";
  if (lower.includes("spear")) return "lance";
  if (lower.includes("dagger") || lower.includes("dague")) return "dague";
  if (lower.includes("mace") || lower.includes("masse")) return "masse";
  if (lower.includes("staff") || lower.includes("bâton")) return "bâton";
  
  return null;
}

export function guessType(item: ItemRecord) {
  const eq = item.equipment_type;
  if (eq && eq.trim()) return eq.trim();

  const id = item.item_id || "";
  const lower = id.toLowerCase();
  if (lower.includes("sword")) return "weapon";
  if (lower.includes("bow") || lower.includes("crossbow")) return "weapon";
  if (lower.includes("axe") || lower.includes("pickaxe") || lower.includes("shovel") || lower.includes("hoe"))
    return "tool";
  if (lower.includes("helmet") || lower.includes("chestplate") || lower.includes("leggings") || lower.includes("boots"))
    return "armor";
  if (lower.includes("shield")) return "armor";
  return "misc";
}

function buildOriginLabelMap(
  origins: OriginsFile["origins"] | ItemsFile["bosses"]
): Map<string, string> {
  const map = new Map<string, string>();
  const list = Array.isArray(origins) ? origins : [];
  for (const b of list) {
    if (b?.id != null && b?.label != null) map.set(b.id, b.label);
  }
  return map;
}

export function enrichItem(raw: ItemRecord, bossLabelMap?: Map<string, string>): EnrichedItem {
  const disp = raw.display || {};
  const labelName = disp.name_plain || disp.name_text || raw.item_id || "Objet sans nom";

  let bosses: string[];
  if (
    Array.isArray(raw.dropped_by_bosses) &&
    raw.dropped_by_bosses.length > 0 &&
    bossLabelMap?.size
  ) {
    bosses = raw.dropped_by_bosses
      .map((id) => bossLabelMap.get(id) ?? id)
      .filter(Boolean);
    bosses = [...new Set(bosses)].sort();
  } else {
    bosses = extractBossesFromSources(raw.sources);
  }

  const typeKey = guessType(raw);
  const weaponSubtype = guessWeaponSubtype(raw);
  const sourcesCount = Array.isArray(raw.sources) ? raw.sources.length : 0;
  const bossesCount = bosses.length;
  return { ...raw, labelName, bosses, typeKey, weaponSubtype, sourcesCount, bossesCount };
}

export type LoadedData = {
  file: ItemsFile;
  items: EnrichedItem[];
  origins: OriginsFile | null;
};

export async function loadItemsFile(): Promise<LoadedData> {
  const [itemsRes, originsRes] = await Promise.all([
    fetch("/items.json"),
    fetch("/origins.json"),
  ]);
  if (!itemsRes.ok) throw new Error(`Impossible de charger items.json (${itemsRes.status})`);
  const file = (await itemsRes.json()) as ItemsFile;

  let origins: OriginsFile | null = null;
  if (originsRes.ok) {
    try {
      origins = (await originsRes.json()) as OriginsFile;
    } catch {
      origins = null;
    }
  }

  const originLabelMap =
    origins?.origins?.length ? buildOriginLabelMap(origins.origins) : buildOriginLabelMap(file.bosses);
  const items = (file.items || []).map((raw) => enrichItem(raw, originLabelMap));

  return { file, items, origins };
}

/** Ordre de rareté descendant (plus rare → moins rare). Codes du datapack. */
const RARITY_ORDER_DESC = [
  "myt",        // Mythic
  "ult",        // Ultimate
  "leg_armset", // Set Légendaire
  "leg",        // Légendaire
  "epi_set",    // Set Epic
  "epi",        // Epic
  "rar",        // Rare
  "com",        // Commun
  "unc",        // Uncommon
  "unk",        // Unk
  "spe",        // Spe
  "cur",        // Cur
  "misc",       // Misc
  "que",        // Quest
];

function rarityRank(r?: string | null): number {
  if (r == null || r === "") return RARITY_ORDER_DESC.length;
  const key = String(r).toLowerCase().trim();
  const idx = RARITY_ORDER_DESC.indexOf(key);
  return idx === -1 ? RARITY_ORDER_DESC.length : idx;
}

export type SortKey = "rarity";

/** Tri par rareté uniquement. desc = plus rare au moins rare (défaut), asc = moins rare au plus rare */
export function sortItems(items: EnrichedItem[], _sortKey: SortKey, dir: "asc" | "desc") {
  const mul = dir === "desc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const cmp = rarityRank(a.rarity) - rarityRank(b.rarity);
    if (cmp !== 0) return cmp * mul;
    return a.key.localeCompare(b.key);
  });
}

