/**
 * Mapping des emojis pour chaque stat
 */
export const STAT_EMOJIS: Record<string, string> = {
  STR: "💪", // Force
  DAR: "🗡️", // Dégâts (non spécifié, on garde)
  HAS: "⚔️", // Vitesse d'attaque
  SPD: "⚡", // Vitesse
  RES: "🛡️", // Résistance
  HER: "❤️", // Régénération de vie
  HUN: "🍖", // Faim
  LUC: "🍀", // Chance
};

/**
 * Retourne l'emoji pour une stat donnée
 */
export function getStatEmoji(statName: string): string {
  return STAT_EMOJIS[statName.toUpperCase()] || "📊";
}
