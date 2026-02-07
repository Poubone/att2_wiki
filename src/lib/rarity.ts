/**
 * Utilitaires pour gérer les couleurs et styles de rareté
 */

import { getFirstColorFromMinecraftText } from "../components/MinecraftText";

export type RarityLevel = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'unknown';

/** Codes du datapack (com, unc, rar, epi, leg, etc.) → niveau standardisé */
const RARITY_CODE_MAP: Record<string, RarityLevel> = {
  com: 'common',
  unc: 'uncommon',
  rar: 'rare',
  epi: 'epic',
  epi_set: 'epic',
  leg: 'legendary',
  leg_armset: 'legendary',
  myt: 'legendary',  // Mythic
  ult: 'legendary',  // Ultimate
};

/**
 * Mappe les raretés (codes datapack ou libellés) vers les niveaux standardisés.
 * Codes du datapack : com, unc, rar, epi, leg (pas "rare", "legendary", etc.).
 */
export function normalizeRarity(rarity: string | null | undefined): RarityLevel {
  if (!rarity) return 'unknown';
  const lower = rarity.toLowerCase().trim();
  const mapped = RARITY_CODE_MAP[lower];
  if (mapped) return mapped;

  if (lower.includes('common') || lower.includes('commun')) return 'common';
  if (lower.includes('uncommon') || lower.includes('peu commun')) return 'uncommon';
  if (lower.includes('rare')) return 'rare';
  if (lower.includes('epic') || lower.includes('épique')) return 'epic';
  if (lower.includes('legendary') || lower.includes('légendaire')) return 'legendary';

  return 'unknown';
}

export const RARITY_COLORS: Record<RarityLevel, string> = {
  common: 'text-gray-300',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400',
  unknown: 'text-gray-400',
};

export const RARITY_BORDER: Record<RarityLevel, string> = {
  common: 'border-gray-500',
  uncommon: 'border-green-500',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-yellow-500',
  unknown: 'border-gray-400',
};

/** Couleur pleine pour barre décorative / accents (pas de transparence) */
export const RARITY_BAR: Record<RarityLevel, string> = {
  common: 'bg-gray-500',
  uncommon: 'bg-green-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-yellow-500',
  unknown: 'bg-gray-500',
};

/** Couleur d’icône : soit une classe Tailwind, soit un style pour hex (couleur du nom) */
export type IconColorResult = { className?: string; style?: { color: string } };

/** Noms de couleurs Minecraft (JSON name_raw "color") → hex, comme les codes § du nom affiché */
const MINECRAFT_JSON_COLOR_TO_HEX: Record<string, string> = {
  black: '#000000',
  dark_blue: '#0000AA',
  dark_green: '#00AA00',
  dark_aqua: '#00AAAA',
  dark_red: '#AA0000',
  dark_purple: '#AA00AA',
  gold: '#FFAA00',
  gray: '#AAAAAA',
  dark_gray: '#555555',
  blue: '#5555FF',
  green: '#55FF55',
  aqua: '#55FFFF',
  red: '#FF5555',
  light_purple: '#FF55FF',
  yellow: '#FFFF55',
  white: '#FFFFFF',
};

/**
 * Extrait la première couleur (hex) depuis le même contenu que le nom affiché :
 * - name_raw (JSON) : clé "color" du composant de texte (nom ou hex).
 * - name_text : codes § (même parsing que MinecraftText).
 */
function getDisplayNameColorHex(display: { name_raw?: string | null; name_text?: string | null } | null | undefined): string | null {
  if (!display) return null;
  const raw = display.name_raw?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { color?: string; extra?: unknown[] };
      const color = parsed?.color;
      if (typeof color === 'string' && color) {
        if (color.startsWith('#')) return color;
        const hex = MINECRAFT_JSON_COLOR_TO_HEX[color.toLowerCase()];
        if (hex) return hex;
      }
      const extra = parsed?.extra;
      if (Array.isArray(extra)) {
        for (const child of extra) {
          const sub = typeof child === 'object' && child && 'color' in child ? (child as { color?: string }).color : null;
          if (typeof sub === 'string' && sub) {
            if (sub.startsWith('#')) return sub;
            const hex = MINECRAFT_JSON_COLOR_TO_HEX[sub.toLowerCase()];
            if (hex) return hex;
          }
        }
      }
    } catch {
      // ignore invalid JSON
    }
  }
  return getFirstColorFromMinecraftText(display.name_text) ?? null;
}

/**
 * Couleur de l’icône : exactement la même que le nom de l’item.
 * - Récupérée comme le nom (name_raw JSON "color" ou name_text §).
 * - Mythiques (myt) : forcé bleu.
 * - Sinon : couleur selon la rareté.
 */
export function getIconColor(item: {
  rarity?: string | null;
  display?: { name_raw?: string | null; name_text?: string | null } | null;
}): IconColorResult {
  const rarity = (item.rarity || '').toLowerCase().trim();
  if (rarity === 'myt') {
    return { style: { color: '#5555FF' } };
  }
  const hex = getDisplayNameColorHex(item.display);
  if (hex) {
    return { style: { color: hex } };
  }
  const level = normalizeRarity(item.rarity);
  return { className: RARITY_COLORS[level] ?? RARITY_COLORS.unknown };
}
