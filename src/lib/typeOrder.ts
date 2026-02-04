/**
 * Ordre de tri pour les types d'items
 */
export const TYPE_ORDER: Record<string, number> = {
  weapon: 1,
  armor: 2,
  tool: 3,
  consumable: 4,
  material: 5,
  block: 6,
  misc: 7,
};

/**
 * Retourne l'ordre d'un type pour le tri
 */
export function getTypeOrder(typeKey: string | null | undefined): number {
  if (!typeKey) return 999;
  return TYPE_ORDER[typeKey.toLowerCase()] || 999;
}
