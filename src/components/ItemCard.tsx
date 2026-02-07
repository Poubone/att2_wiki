import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { EnrichedItem } from "../types";
import { humanize } from "../lib/items";
import { detectSet } from "../lib/sets";
import {
  extractStatsFromLore,
  formatStatValue,
  hasBaseStats,
  hasSetStats,
} from "../lib/stats";
import { normalizeRarity, RARITY_COLORS, getIconColor } from "../lib/rarity";
import { getStatEmoji } from "../lib/statEmojis";
import { MinecraftText } from "./MinecraftText";
import { Sword, Shield, Pickaxe, FlaskConical, Gem, Box, Sparkles } from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  weapon: Sword,
  armor: Shield,
  tool: Pickaxe,
  consumable: FlaskConical,
  material: Gem,
  block: Box,
};

export function ItemCard({ item }: { item: EnrichedItem }) {
  const { t } = useTranslation();
  // Utiliser lore_text (avec couleurs) si disponible, sinon lore_plain
  const loreLines = item.display?.lore_text || item.display?.lore_plain || [];

  // Détecter si l'item fait partie d'un set
  const { isSet, setName } = detectSet(item);

  // Extraire les stats depuis le lore (séparer base et set)
  const { base: baseStats, set: setStats } = extractStatsFromLore(loreLines, isSet);

  // Normaliser la rareté et obtenir les styles
  const rarity = normalizeRarity(item.rarity);
  const rarityColor = RARITY_COLORS[rarity];

  // Détecter si c'est de l'argent (contient "coins" ou "chronoton" dans le nom ou la description)
  const itemName = (item.display?.name_text || item.display?.name_plain || item.labelName || "").toLowerCase();
  const itemId = (item.item_id || "").toLowerCase();
  const loreText = (item.display?.lore_text || item.display?.lore_plain || []).join(" ").toLowerCase();
  const isCoins = itemName.includes("coin") || itemName.includes("chronoton") || 
                  itemId.includes("coin") || itemId.includes("chronoton") || 
                  loreText.includes("coin") || loreText.includes("chronoton");

  // Icône selon le type ou le contenu
  let Icon = CATEGORY_ICONS[item.typeKey || ''] || Sword;
  if (isCoins) {
    Icon = Gem; // Diamant pour l'argent/coins
  } else if (item.typeKey === 'consumable' || itemName.includes("potion") || itemId.includes("potion")) {
    Icon = FlaskConical; // Potion pour les consommables/potions
  }

  const iconColor = getIconColor(item);

  return (
    <Link
      to={`/items/${item.key}`}
      className={`group relative block p-4 border-2 bg-card  border-gray-500 hover:bg-secondary/50 transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-black/30`}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Pixel corner decorations */}
      <div className="absolute top-0 left-0 w-2 h-2 bg-border" />
      <div className="absolute top-0 right-0 w-2 h-2 bg-border" />
      <div className="absolute bottom-0 left-0 w-2 h-2 bg-border" />
      <div className="absolute bottom-0 right-0 w-2 h-2 bg-border" />

      {/* Set badge */}
      {isSet && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="bg-purple-600 border-2 border-purple-400 p-1">
            <Sparkles className="w-4 h-4 text-purple-200" />
          </div>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Item Icon : couleur forcée en style inline pour que le SVG (stroke: currentColor) l’hérite */}
        <div className="w-16 h-16 flex items-center justify-center bg-gray-600/20 border-2 border-gray-500 shrink-0">
          <Icon className={`w-8 h-8 ${iconColor.className ?? ""}`.trim()} style={iconColor.style} />
        </div>

        {/* Item Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-2xl font-minecraft ${rarityColor} truncate`}>
              <MinecraftText text={item.display?.name_text || item.labelName} />
            </h3>
            {isSet && (
              <span className="px-3 py-1 bg-purple-600/30 border border-purple-400 text-sm font-bold uppercase text-purple-200">
                SET
              </span>
            )}
          </div>
          <p className="text-base text-muted-foreground capitalize mt-1">
            {item.rarity ? humanize(item.rarity) : t("common.rarityUnknown")} • {item.typeKey ? humanize(item.typeKey) : t("common.unknown")}
          </p>
          {isSet && setName && (
            <p className="text-sm text-purple-300/80 mt-1">{t("common.setLabel")}: {setName}</p>
          )}
          <p className="text-sm text-muted-foreground/70 mt-1 truncate">{item.item_id}</p>

          {/* Lore preview */}
          <div className="mt-3 space-y-1">
            {loreLines.length > 0 ? (
              loreLines.slice(0, 2).map((line, idx) => (
                <p key={idx} className="text-base text-foreground/70 line-clamp-1">
                  <MinecraftText text={typeof line === "string" ? line : null} />
                </p>
              ))
            ) : (
              <p className="text-base italic text-muted-foreground/70">{t("common.noDescription")}</p>
            )}
          </div>

          {/* Footer avec uniquement les stats */}
          <footer className="relative mt-4 flex flex-wrap items-center gap-2">
            {/* Stats de base */}
            {hasBaseStats(baseStats) &&
              Object.entries(baseStats).map(([statName, value]) => {
                if (value === undefined) return null;
                const isPositive = value > 0;
                const isNegative = value < 0;
                return (
                  <span
                    key={`base-${statName}`}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold text-sm ${
                      isPositive
                        ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
                        : isNegative
                          ? "bg-red-500/20 text-red-200 border border-red-400/30"
                          : "bg-gray-500/20 text-gray-200 border border-gray-400/30"
                    }`}
                  >
                    {getStatEmoji(statName)} {statName} {formatStatValue(value)}
                  </span>
                );
              })}
            {/* Stats du set (en surbrillance) */}
            {hasSetStats(setStats) &&
              Object.entries(setStats).map(([statName, value]) => {
                if (value === undefined) return null;
                const isPositive = value > 0;
                const isNegative = value < 0;
                return (
                  <span
                    key={`set-${statName}`}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-bold shadow-lg text-sm ${
                      isPositive
                        ? "bg-gradient-to-r from-purple-500/40 to-purple-600/40 text-purple-100 border-2 border-purple-400/60"
                        : isNegative
                          ? "bg-gradient-to-r from-red-500/40 to-red-600/40 text-red-100 border-2 border-red-400/60"
                          : "bg-gradient-to-r from-gray-500/40 to-gray-600/40 text-gray-100 border-2 border-gray-400/60"
                    }`}
                    title={t("common.statSetTitle", { stat: statName, value: formatStatValue(value) })}
                  >
                    ⭐ {getStatEmoji(statName)} {statName} {formatStatValue(value)}
                  </span>
                );
              })}
          </footer>
        </div>
      </div>
    </Link>
  );
}

