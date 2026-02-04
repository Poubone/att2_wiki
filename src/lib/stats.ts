/**
 * Extrait les statistiques depuis le lore d'un item.
 * Les stats sont au format: STR, DAR, HAS, SPD, RES, HER, HUN, LUC
 * avec des valeurs comme "+5", "-2", etc.
 */

export type ItemStats = {
  STR?: number;
  DAR?: number;
  HAS?: number;
  SPD?: number;
  RES?: number;
  HER?: number;
  HUN?: number;
  LUC?: number;
};

const STAT_NAMES = ["STR", "DAR", "HAS", "SPD", "RES", "HER", "HUN", "LUC"] as const;

/**
 * Nettoie le texte en enlevant les codes de formatage Minecraft pour faciliter la recherche
 */
function stripFormatting(text: string): string {
  // Enlever les codes § + caractère
  return text.replace(/\u00A7./g, "");
}

/**
 * Extrait les stats depuis une ligne de lore
 */
function extractStatsFromLine(line: string): Partial<ItemStats> {
  const stats: Partial<ItemStats> = {};
  const cleanLine = stripFormatting(line);

  for (const statName of STAT_NAMES) {
    // Chercher le pattern: STAT_NAME suivi d'un espace optionnel et d'un signe +/- et un nombre
    // Exemples: "STR +5", "DAR -2", "HAS +10", etc.
    const regex = new RegExp(`\\b${statName}\\s*([+-]?\\d+)`, "i");
    const match = cleanLine.match(regex);
    if (match) {
      const value = parseInt(match[1], 10);
      if (!isNaN(value)) {
        stats[statName] = value;
      }
    }
  }

  return stats;
}

/**
 * Extrait toutes les stats depuis le lore d'un item, en séparant les stats de base des stats du set
 */
export function extractStatsFromLore(
  lore: (string | null)[] | null | undefined,
  isSet: boolean = false
): { base: ItemStats; set: ItemStats } {
  const baseStats: ItemStats = {};
  const setStats: ItemStats = {};

  if (!Array.isArray(lore)) return { base: baseStats, set: setStats };

  let foundSetMention = false;
  let setMentionIndex = -1;

  // D'abord, trouver où le set est mentionné
  if (isSet) {
    for (let i = 0; i < lore.length; i++) {
      const line = lore[i];
      if (!line || typeof line !== "string") continue;
      const cleanLine = stripFormatting(line).toLowerCase();
      if (/\bset\b/i.test(cleanLine)) {
        foundSetMention = true;
        setMentionIndex = i;
        break;
      }
    }
  }

  // Identifier d'abord quelles lignes sont des lignes de set
  const setLineIndices = new Set<number>();
  if (isSet) {
    for (let i = 0; i < lore.length; i++) {
      const line = lore[i];
      if (!line || typeof line !== "string") continue;
      const cleanLine = stripFormatting(line).toLowerCase();
      
      // Vérifier si cette ligne est liée au set
      // Les stats du set sont dans une ligne qui :
      // 1. Mentionne "set" ET contient des stats
      // 2. Est proche d'une mention de set (dans les 2 lignes suivantes) ET contient des stats
      const hasSetKeyword = /\bset\b/i.test(cleanLine);
      const lineStats = extractStatsFromLine(line);
      const hasStats = Object.keys(lineStats).length > 0;
      const isNearSetMention = foundSetMention && i > setMentionIndex && i <= setMentionIndex + 2;
      
      if (hasStats && (hasSetKeyword || isNearSetMention)) {
        setLineIndices.add(i);
      }
    }
  }

  // Maintenant, extraire les stats : baseStats = toutes les stats SAUF celles des lignes de set
  // setStats = uniquement les stats des lignes de set
  for (let i = 0; i < lore.length; i++) {
    const line = lore[i];
    if (!line || typeof line !== "string") continue;
    const lineStats = extractStatsFromLine(line);
    const isSetLine = setLineIndices.has(i);
    
    for (const [statName, value] of Object.entries(lineStats)) {
      if (value !== undefined) {
        if (isSetLine) {
          // Stats du set
          setStats[statName as keyof ItemStats] = value;
        } else {
          // Stats de base - seulement si cette stat n'est pas déjà dans setStats
          // (pour éviter d'afficher la même stat deux fois)
          if (setStats[statName as keyof ItemStats] === undefined) {
            baseStats[statName as keyof ItemStats] = value;
          }
        }
      }
    }
  }

  return { base: baseStats, set: setStats };
}

/**
 * Extrait toutes les stats depuis le lore d'un item (compatibilité avec l'ancien code)
 */
export function extractAllStatsFromLore(lore: (string | null)[] | null | undefined): ItemStats {
  const { base, set } = extractStatsFromLore(lore, false);
  // Fusionner base et set pour l'affichage simple
  return { ...base, ...set };
}

/**
 * Vérifie si un item a des stats
 */
export function hasStats(stats: ItemStats): boolean {
  return Object.keys(stats).length > 0;
}

/**
 * Vérifie si un item a des stats de base
 */
export function hasBaseStats(base: ItemStats): boolean {
  return Object.keys(base).length > 0;
}

/**
 * Vérifie si un item a des stats de set
 */
export function hasSetStats(set: ItemStats): boolean {
  return Object.keys(set).length > 0;
}

/**
 * Formate une valeur de stat pour l'affichage
 */
export function formatStatValue(value: number): string {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

/**
 * Retourne la liste des noms de stats trouvées
 */
export function getStatNames(stats: ItemStats): string[] {
  return Object.keys(stats).filter((key) => stats[key as keyof ItemStats] !== undefined) as string[];
}
