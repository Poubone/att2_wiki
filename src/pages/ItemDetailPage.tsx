import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Zap, MapPin, Sparkles, Sword, Shield, Pickaxe, FlaskConical, Gem, Box, BookMarked } from "lucide-react";
import { Chip } from "../components/Chip";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { MinecraftText } from "../components/MinecraftText";
import { humanize, loadItemsFile } from "../lib/items";
import type { OriginsFile, OriginEntry } from "../types";
import { detectSet } from "../lib/sets";
import {
  extractStatsFromLore,
  formatStatValue,
  hasBaseStats,
  hasSetStats,
} from "../lib/stats";
import { normalizeRarity, RARITY_BAR, RARITY_BORDER, RARITY_COLORS, getIconColor } from "../lib/rarity";
import { getStatEmoji } from "../lib/statEmojis";
import type { EnrichedItem } from "../types";

/** Affiche un libellé lisible pour un id d'enchantement (ex. minecraft:sharpness → Sharpness). */
function formatEnchantmentName(id: string): string {
  const part = id.includes(":") ? id.split(":")[1] : id;
  return humanize(part);
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  weapon: Sword,
  armor: Shield,
  tool: Pickaxe,
  consumable: FlaskConical,
  material: Gem,
  block: Box,
};

export default function ItemDetailPage() {
  const { key } = useParams();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<EnrichedItem[]>([]);
  const [origins, setOrigins] = useState<OriginsFile | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { items: loadedItems, origins: loadedOrigins } = await loadItemsFile();
        if (!mounted) return;
        setItems(loadedItems);
        setOrigins(loadedOrigins ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const item = useMemo(() => items.find((x) => x.key === key) || null, [items, key]);

  const bossesByRegion = useMemo(() => {
    if (!item || !origins?.origins?.length) return null;
    const ids = item.dropped_by_bosses || [];
    if (ids.length === 0) return null;
    const map = new Map<number, OriginEntry[]>();
    const noZone: OriginEntry[] = [];
    for (const id of ids) {
      const o = origins.origins.find((x) => x.id === id);
      if (!o) continue;
      const z = o.zone ?? o.region;
      if (z != null && z >= 1 && z <= 4) {
        if (!map.has(z)) map.set(z, []);
        map.get(z)!.push(o);
      } else {
        noZone.push(o);
      }
    }
    const regions: { zone: number; label: string; entries: OriginEntry[] }[] = [];
    for (const z of [1, 2, 3, 4]) {
      const entries = map.get(z);
      if (entries?.length)
        regions.push({
          zone: z,
          label: origins.zones?.find((x) => x.id === z)?.label ?? `Région ${z}`,
          entries,
        });
    }
    if (noZone.length) regions.push({ zone: 0, label: "", entries: noZone });
    return regions;
  }, [item, origins]);

  const gameLevelRanges = useMemo(() => {
    if (!item) return [];
    const sources = item.sources || [];
    const ranges: { lo: number; hi: number | null }[] = [];
    const seen = new Set<string>();
    for (const s of sources) {
      const ctxs = typeof s === "object" && s.monster_contexts ? s.monster_contexts : [];
      for (const ctx of ctxs) {
        const gr = ctx.gamelevel_range;
        if (!gr || gr.length < 2) continue;
        const rangeKey = gr[1] == null ? `${gr[0]}+` : `${gr[0]}-${gr[1]}`;
        if (seen.has(rangeKey)) continue;
        seen.add(rangeKey);
        ranges.push({ lo: gr[0], hi: gr[1] ?? null });
      }
    }
    ranges.sort((a, b) => a.lo - b.lo);
    return ranges;
  }, [item]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b-4 border-border bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="text-foreground hover:text-primary gap-2 text-lg inline-flex items-center">
              <ArrowLeft className="w-5 h-5" />
              {t("common.backToWiki")}
            </Link>
            <LanguageSwitcher />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">{t("common.loading")}</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b-4 border-border bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="text-foreground hover:text-primary gap-2 text-lg inline-flex items-center">
              <ArrowLeft className="w-5 h-5" />
              {t("common.backToWiki")}
            </Link>
            <LanguageSwitcher />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12 bg-card border-2 border-destructive p-8">
            <p className="text-xl text-destructive">
              {t("common.error")}: {error || t("common.errorUnknown")}
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b-4 border-border bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="text-foreground hover:text-primary gap-2 text-lg inline-flex items-center">
              <ArrowLeft className="w-5 h-5" />
              {t("common.backToWiki")}
            </Link>
            <LanguageSwitcher />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12 bg-card border-2 border-border p-8">
            <p className="text-xl text-muted-foreground">{t("detail.itemNotFound", { key })}</p>
          </div>
        </main>
      </div>
    );
  }

  const disp = item.display || {};
  // Utiliser lore_text (avec couleurs) si disponible, sinon lore_plain
  const lore = disp.lore_text || disp.lore_plain || [];
  const bosses = item.bosses || [];

  // Détecter si l'item fait partie d'un set
  const { isSet, setName } = detectSet(item);

  // Extraire les stats depuis le lore (séparer base et set)
  const { base: baseStats, set: setStats } = extractStatsFromLore(lore, isSet);

  // Calculer les stats de probabilités
  const sourcesWithChance = Array.isArray(item.sources)
    ? item.sources.filter((s) => typeof s === "object" && "chance" in s && s.chance !== undefined)
    : [];
  const avgChance =
    sourcesWithChance.length > 0
      ? sourcesWithChance.reduce((sum, s) => sum + (typeof s === "object" && "chance" in s ? s.chance || 0 : 0), 0) /
        sourcesWithChance.length
      : null;

  const rarity = normalizeRarity(item.rarity);
  const rarityBorder = RARITY_BORDER[rarity];
  const rarityColor = RARITY_COLORS[rarity] ?? RARITY_COLORS.unknown;

  // Détecter si c'est de l'argent (contient "coins" ou "chronoton" dans le nom ou la description)
  const itemName = (disp.name_text || disp.name_plain || item.labelName || "").toLowerCase();
  const itemId = (item.item_id || "").toLowerCase();
  const loreText = (lore || []).join(" ").toLowerCase();
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
  const enchantments = item.enchantments ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-foreground hover:text-primary gap-2 text-lg inline-flex items-center">
            <ArrowLeft className="w-5 h-5" />
            {t("common.backToWiki")}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Barre décorative : couleur selon rareté (dictionnaire RARITY_BAR) */}
      <div className={`h-2 ${RARITY_BAR[rarity]}`} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Item Header Card */}
          <div
            className="p-6 border-4 border-gray-500 bg-card relative"
          >
            {/* Pixel corners */}
            <div className="absolute top-0 left-0 w-3 h-3 bg-border" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-border" />
            <div className="absolute bottom-0 left-0 w-3 h-3 bg-border" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-border" />

            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Grande icône : comme le template — RARITY_COLORS directement sur l’Icon */}
              <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center bg-gray-600/20 border-4 border-gray-500 shrink-0">
                <Icon className={`w-16 h-16 md:w-20 md:h-20 ${iconColor.className ?? ""}`.trim()} style={iconColor.style} />
              </div>

              {/* Item Info */}
              <div className="flex-1">
                <h1
                  className={`text-4xl md:text-5xl font-minecraft ${rarityColor}`}
                >
                  <MinecraftText text={disp.name_text || item.labelName} />
                </h1>
                <div className="flex flex-wrap gap-3 mt-2">
                  <span
                    className={`px-3 py-1 border-2 ${rarityBorder} text-base capitalize ${rarityColor}`}
                  >
                    {item.rarity ? humanize(item.rarity) : t("common.rarityUnknown")}
                  </span>
                  <span className="px-3 py-1 bg-secondary border-2 border-border text-base text-foreground">
                    {item.typeKey ? humanize(item.typeKey) : t("common.unknown")}
                  </span>
                  {isSet && (
                    <span className="px-3 py-1 bg-purple-600/30 border-2 border-purple-400 text-base font-bold text-purple-200 flex items-center gap-1">
                      <Sparkles className="w-4 h-4" />
                      SET
                    </span>
                  )}
                  {isSet && setName && setName !== "Set" && (
                    <span className="px-3 py-1 bg-purple-600/30 border-2 border-purple-400 text-base text-purple-200">
                      {setName}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2 font-mono">{item.item_id}</p>
                {lore.length > 0 && (
                  <p className="text-lg text-accent italic mt-3">
                    {'"'}
                    <MinecraftText text={typeof lore[0] === "string" ? lore[0] : null} />
                    {'"'}
                  </p>
                )}
                {/* Enchantements dans l'en-tête */}
                {enchantments.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <BookMarked className="w-4 h-4 text-primary shrink-0" aria-hidden />
                    <span className="text-sm text-muted-foreground">{t("detail.enchantments")}:</span>
                    <span className="text-sm font-minecraft text-primary">
                      {enchantments
                        .map((enc) => `${formatEnchantmentName(enc.id)} ${t("detail.enchantmentLevel", { n: enc.lvl })}`)
                        .join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section Enchantements (détail) */}
          {enchantments.length > 0 && (
            <div className="p-6 border-4 border-border bg-card relative">
              <div className="absolute top-0 left-0 w-3 h-3 bg-border" />
              <div className="absolute top-0 right-0 w-3 h-3 bg-border" />
              <div className="absolute bottom-0 left-0 w-3 h-3 bg-border" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-border" />
              <h2 className="text-2xl font-minecraft text-primary flex items-center gap-2 mb-4">
                <BookMarked className="w-6 h-6" />
                {t("detail.enchantments")}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {enchantments.map((enc, idx) => (
                  <li
                    key={`${enc.id}-${enc.lvl}-${idx}`}
                    className="px-3 py-1.5 bg-primary/20 border-2 border-primary text-primary font-minecraft"
                  >
                    {formatEnchantmentName(enc.id)} {t("detail.enchantmentLevel", { n: enc.lvl })}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Stats Section */}
          {(hasBaseStats(baseStats) || hasSetStats(setStats)) && (
            <div className="p-6 border-4 border-border bg-card relative">
              <div className="absolute top-0 left-0 w-3 h-3 bg-border" />
              <div className="absolute top-0 right-0 w-3 h-3 bg-border" />
              <div className="absolute bottom-0 left-0 w-3 h-3 bg-border" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-border" />

              <h2 className="text-2xl font-minecraft text-primary flex items-center gap-2 mb-4">
                <Zap className="w-6 h-6" />
                {t("detail.statistics")}
              </h2>
              <div className="space-y-4">
                {/* Stats de base */}
                {hasBaseStats(baseStats) && (
                  <div>
                    <div className="mb-2 text-sm font-medium text-muted-foreground">{t("common.statsBase")}</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(baseStats).map(([statName, value]) => {
                        if (value === undefined) return null;
                        const isPositive = value > 0;
                        const isNegative = value < 0;
                        return (
                          <div key={`base-${statName}`} className="p-4 bg-secondary/50 border-2 border-border text-center">
                            <div className="text-3xl mb-1">{getStatEmoji(statName)}</div>
                            <div className={`text-2xl font-minecraft ${
                              isPositive
                                ? "text-emerald-400"
                                : isNegative
                                  ? "text-red-400"
                                  : "text-gray-400"
                            }`}>
                              {formatStatValue(value)}
                            </div>
                            <div className="text-sm text-muted-foreground">{statName}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Stats du set (en surbrillance) */}
                {hasSetStats(setStats) && (
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-purple-300">
                      <Sparkles className="w-4 h-4" />
                      <span>{setName ? t("common.statsSetWithName", { name: setName }) : t("common.statsSet")}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(setStats).map(([statName, value]) => {
                        if (value === undefined) return null;
                        const isPositive = value > 0;
                        const isNegative = value < 0;
                        return (
                          <div key={`set-${statName}`} className="p-4 bg-purple-600/30 border-2 border-purple-400 text-center">
                            <div className="text-3xl mb-1">{getStatEmoji(statName)}</div>
                            <div className={`text-2xl font-minecraft ${
                              isPositive
                                ? "text-purple-200"
                                : isNegative
                                  ? "text-red-300"
                                  : "text-gray-300"
                            }`}>
                              ⭐ {formatStatValue(value)}
                            </div>
                            <div className="text-sm text-purple-300">{statName}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Obtained From Section */}
          <div className="p-6 border-4 border-border bg-card relative">
            <div className="absolute top-0 left-0 w-3 h-3 bg-border" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-border" />
            <div className="absolute bottom-0 left-0 w-3 h-3 bg-border" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-border" />

            <h2 className="text-2xl font-minecraft text-primary flex items-center gap-2 mb-4">
              <MapPin className="w-6 h-6" />
              {t("detail.howToObtain")}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-secondary/50 border-2 border-border text-center">
                  <div className="text-2xl font-minecraft text-foreground">{item.sourcesCount}</div>
                  <div className="text-sm text-muted-foreground">{t("common.sources")}</div>
                </div>
                <div className="p-4 bg-secondary/50 border-2 border-border text-center">
                  <div className="text-2xl font-minecraft text-foreground">{bosses.length}</div>
                  <div className="text-sm text-muted-foreground">{t("common.boss")}</div>
                </div>
                {avgChance !== null && (
                  <div className="p-4 bg-secondary/50 border-2 border-border text-center">
                    <div className="text-2xl font-minecraft text-foreground">
                      {(avgChance * 100).toFixed(3)}%
                    </div>
                    <div className="text-sm text-muted-foreground">{t("common.averageProbability")}</div>
                  </div>
                )}
                {item.equipment_type && (
                  <div className="p-4 bg-secondary/50 border-2 border-border text-center">
                    <div className="text-lg font-minecraft text-foreground">{item.equipment_type}</div>
                    <div className="text-sm text-muted-foreground">{t("common.type")}</div>
                  </div>
                )}
              </div>
              {bosses.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">{t("detail.bossesDetected")}</div>
                  {bossesByRegion && bossesByRegion.length > 0 ? (
                    <div className="space-y-3">
                      {bossesByRegion.map(({ zone, label, entries }) => (
                        <div key={zone || "other"}>
                          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                            {label || t("detail.otherOrigin")}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {entries.map((o) => (
                              <Chip
                                key={o.id}
                                variant={o.type === "boss_dedicated" ? "boss" : "elite"}
                              >
                                {o.label}
                              </Chip>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {bosses.map((b) => (
                        <Chip key={b} variant="boss">
                          {b}
                        </Chip>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 italic">{t("detail.bossDropMechanicDetail")}</p>
                  {(bossesByRegion?.some((g) => g.entries.some((e) => e.type === "superelite" || e.type === "megaelite")) ?? false) && (
                    <p className="text-xs text-muted-foreground mt-3 p-2 bg-muted/50 border border-border rounded">
                      {t("detail.eliteClassLegend")}
                    </p>
                  )}
                </div>
              )}
              {gameLevelRanges.length > 0 && (
                <div className="mt-4 pt-4 border-t-2 border-border">
                  <div className="text-sm font-medium text-muted-foreground mb-2">{t("detail.gameLevelSection")}</div>
                  <p className="text-sm text-foreground mb-2">{t("detail.gameLevelDetail")}</p>
                  <div className="flex flex-wrap gap-2">
                    {gameLevelRanges.map(({ lo, hi }, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-secondary border-2 border-border text-sm font-minecraft"
                      >
                        {hi == null ? t("detail.gameLevelFrom", { n: lo }) : t("detail.gameLevelRange", { lo, hi })}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description Section */}
          {lore.length > 0 && (
            <div className="p-6 border-4 border-border bg-card relative">
              <div className="absolute top-0 left-0 w-3 h-3 bg-border" />
              <div className="absolute top-0 right-0 w-3 h-3 bg-border" />
              <div className="absolute bottom-0 left-0 w-3 h-3 bg-border" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-border" />

              <h2 className="text-2xl font-minecraft text-primary mb-4">{t("common.description")}</h2>
              <div className="space-y-2 text-lg">
                {lore.map((line, idx) => (
                  <p key={idx}>
                    <MinecraftText text={typeof line === "string" ? line : null} />
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Sources Section */}
          {Array.isArray(item.sources) && item.sources.length > 0 && (
            <div className="p-6 border-4 border-border bg-card relative">
              <div className="absolute top-0 left-0 w-3 h-3 bg-border" />
              <div className="absolute top-0 right-0 w-3 h-3 bg-border" />
              <div className="absolute bottom-0 left-0 w-3 h-3 bg-border" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-border" />

              <h2 className="text-2xl font-minecraft text-primary mb-4">
                {sourcesWithChance.length > 0
                  ? t("detail.lootTablesWithChances", { count: sourcesWithChance.length })
                  : t("detail.lootTablesSources")}
              </h2>
              <ul className="max-h-80 overflow-auto space-y-2">
                {item.sources.map((s, idx) => {
                  const rawPath = typeof s === "string" ? s : s.path;
                  const path = rawPath.replace(/^data\/att2\/loot_tables\//, "");
                  const chance = typeof s === "object" && "chance" in s ? s.chance : undefined;
                  return (
                    <li
                      key={typeof s === "string" ? s : s.path || idx}
                      className="flex items-center justify-between gap-3 p-3 bg-secondary/50 border-2 border-border hover:bg-secondary transition"
                    >
                      <span className="flex-1 truncate text-foreground font-mono text-sm">{path}</span>
                      {chance !== undefined ? (
                        <span className="shrink-0 px-3 py-1 bg-primary/20 border-2 border-primary text-primary font-minecraft text-base">
                          {chance * 100}%
                        </span>
                      ) : (
                        <span className="shrink-0 px-2 py-1 bg-muted border-2 border-border text-muted-foreground text-sm">
                          {t("common.na")}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 p-3 bg-muted/40 border border-border rounded text-sm text-muted-foreground space-y-2">
                <div className="font-minecraft text-foreground font-medium">{t("detail.sourcesLegendTitle")}</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>{t("detail.sourcesLegendRegular")}</li>
                  <li>{t("detail.sourcesLegendChest")}</li>
                  <li>{t("detail.sourcesLegendBoss")}</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-muted-foreground">{t("home.footer")}</p>
        </div>
      </footer>
    </div>
  );
}

