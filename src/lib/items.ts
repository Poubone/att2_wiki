import type { EnrichedItem, ItemRecord, ItemsFile } from "../types";

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

export function enrichItem(raw: ItemRecord): EnrichedItem {
  const disp = raw.display || {};
  const labelName = disp.name_plain || disp.name_text || raw.item_id || "Objet sans nom";
  const bosses = extractBossesFromSources(raw.sources);
  const typeKey = guessType(raw);
  const weaponSubtype = guessWeaponSubtype(raw);
  const sourcesCount = Array.isArray(raw.sources) ? raw.sources.length : 0;
  const bossesCount = bosses.length;
  return { ...raw, labelName, bosses, typeKey, weaponSubtype, sourcesCount, bossesCount };
}

export async function loadItemsFile(): Promise<{ file: ItemsFile; items: EnrichedItem[] }> {
  const res = await fetch("/items.json");
  if (!res.ok) throw new Error(`Impossible de charger items.json (${res.status})`);
  const file = (await res.json()) as ItemsFile;
  const items = (file.items || []).map(enrichItem);
  return { file, items };
}

export type SortKey = "name" | "rarity" | "sources" | "bosses";

export function sortItems(items: EnrichedItem[], sortKey: SortKey, dir: "asc" | "desc") {
  const mul = dir === "asc" ? 1 : -1;
  const rarityKey = (r?: string | null) => (r ?? "").toString();
  return [...items].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = a.labelName.localeCompare(b.labelName, "fr");
        break;
      case "rarity":
        cmp = rarityKey(a.rarity).localeCompare(rarityKey(b.rarity), "fr");
        break;
      case "sources":
        cmp = a.sourcesCount - b.sourcesCount;
        break;
      case "bosses":
        cmp = a.bossesCount - b.bossesCount;
        break;
      default:
        cmp = 0;
    }
    if (cmp === 0) cmp = a.key.localeCompare(b.key);
    return cmp * mul;
  });
}

