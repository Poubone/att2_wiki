import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Zap, MapPin, Sparkles, Sword, Shield, Pickaxe, FlaskConical, Gem, Box } from "lucide-react";
import { Chip } from "../components/Chip";
import { MinecraftText } from "../components/MinecraftText";
import { humanize, loadItemsFile } from "../lib/items";
import { detectSet } from "../lib/sets";
import {
  extractStatsFromLore,
  formatStatValue,
  hasBaseStats,
  hasSetStats,
} from "../lib/stats";
import { normalizeRarity, RARITY_BG, RARITY_BORDER, RARITY_COLORS } from "../lib/rarity";
import { getStatEmoji } from "../lib/statEmojis";
import type { EnrichedItem } from "../types";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<EnrichedItem[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { items } = await loadItemsFile();
        if (!mounted) return;
        setItems(items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const item = useMemo(() => items.find((x) => x.key === key) || null, [items, key]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b-4 border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <Link to="/" className="text-foreground hover:text-primary gap-2 text-lg inline-flex items-center">
              <ArrowLeft className="w-5 h-5" />
              Retour au Wiki
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">Chargement…</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b-4 border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <Link to="/" className="text-foreground hover:text-primary gap-2 text-lg inline-flex items-center">
              <ArrowLeft className="w-5 h-5" />
              Retour au Wiki
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12 bg-card border-2 border-destructive p-8">
            <p className="text-xl text-destructive">Erreur: {error}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b-4 border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <Link to="/" className="text-foreground hover:text-primary gap-2 text-lg inline-flex items-center">
              <ArrowLeft className="w-5 h-5" />
              Retour au Wiki
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12 bg-card border-2 border-border p-8">
            <p className="text-xl text-muted-foreground">Item introuvable ({key}).</p>
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
  const rarityBg = RARITY_BG[rarity];
  const rarityBorder = RARITY_BORDER[rarity];
  const rarityColor = RARITY_COLORS[rarity];

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-foreground hover:text-primary gap-2 text-lg inline-flex items-center">
            <ArrowLeft className="w-5 h-5" />
            Retour au Wiki
          </Link>
        </div>
      </header>

      {/* Decorative bar with rarity color */}
      <div
        className={`h-2 ${
          rarity === 'legendary'
            ? 'bg-yellow-500'
            : rarity === 'epic'
              ? 'bg-purple-500'
              : rarity === 'rare'
                ? 'bg-blue-500'
                : rarity === 'uncommon'
                  ? 'bg-green-500'
                  : 'bg-gray-500'
        }`}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Item Header Card */}
          <div
            className={`p-6 border-4 ${rarityBorder} ${rarityBg} bg-card relative`}
          >
            {/* Pixel corners */}
            <div className="absolute top-0 left-0 w-3 h-3 bg-border" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-border" />
            <div className="absolute bottom-0 left-0 w-3 h-3 bg-border" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-border" />

            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Large Icon avec couleur selon rareté */}
              <div
                className={`w-24 h-24 md:w-32 md:h-32 flex items-center justify-center
                ${rarityBg} border-4 ${rarityBorder} shrink-0`}
              >
                <Icon
                  className="w-16 h-16 md:w-20 md:h-20 stroke-2"
                  style={{
                    stroke: rarity === 'common' ? '#d1d5db' : 
                            rarity === 'uncommon' ? '#4ade80' : 
                            rarity === 'rare' ? '#60a5fa' : 
                            rarity === 'epic' ? '#a78bfa' : 
                            rarity === 'legendary' ? '#facc15' : 
                            '#9ca3af',
                    fill: 'none'
                  }}
                />
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
                    className={`px-3 py-1 ${rarityBg} border-2 ${rarityBorder} text-base capitalize ${rarityColor}`}
                  >
                    {item.rarity ? humanize(item.rarity) : "Rareté inconnue"}
                  </span>
                  <span className="px-3 py-1 bg-secondary border-2 border-border text-base text-foreground">
                    {humanize(item.typeKey)}
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
              </div>
            </div>
          </div>

          {/* Stats Section */}
          {(hasBaseStats(baseStats) || hasSetStats(setStats)) && (
            <div className="p-6 border-4 border-border bg-card relative">
              <div className="absolute top-0 left-0 w-3 h-3 bg-border" />
              <div className="absolute top-0 right-0 w-3 h-3 bg-border" />
              <div className="absolute bottom-0 left-0 w-3 h-3 bg-border" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-border" />

              <h2 className="text-2xl font-minecraft text-primary flex items-center gap-2 mb-4">
                <Zap className="w-6 h-6" />
                Statistiques
              </h2>
              <div className="space-y-4">
                {/* Stats de base */}
                {hasBaseStats(baseStats) && (
                  <div>
                    <div className="mb-2 text-sm font-medium text-muted-foreground">Stats de base</div>
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
                      <span>Stats du set {setName ? `(${setName})` : ""}</span>
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
              Comment l'obtenir
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-secondary/50 border-2 border-border text-center">
                  <div className="text-2xl font-minecraft text-foreground">{item.sourcesCount}</div>
                  <div className="text-sm text-muted-foreground">Sources</div>
                </div>
                <div className="p-4 bg-secondary/50 border-2 border-border text-center">
                  <div className="text-2xl font-minecraft text-foreground">{bosses.length}</div>
                  <div className="text-sm text-muted-foreground">Boss</div>
                </div>
                {avgChance !== null && (
                  <div className="p-4 bg-secondary/50 border-2 border-border text-center">
                    <div className="text-2xl font-minecraft text-foreground">
                      {(avgChance * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Probabilité</div>
                  </div>
                )}
                {item.equipment_type && (
                  <div className="p-4 bg-secondary/50 border-2 border-border text-center">
                    <div className="text-lg font-minecraft text-foreground">{item.equipment_type}</div>
                    <div className="text-sm text-muted-foreground">Type</div>
                  </div>
                )}
              </div>
              {bosses.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Boss détectés:</div>
                  <div className="flex flex-wrap gap-2">
                    {bosses.map((b) => (
                      <Chip key={b} variant="boss">
                        {b}
                      </Chip>
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

              <h2 className="text-2xl font-minecraft text-primary mb-4">Description</h2>
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
                Loot tables sources {sourcesWithChance.length > 0 && `(${sourcesWithChance.length} avec probabilités)`}
              </h2>
              <ul className="max-h-80 overflow-auto space-y-2">
                {item.sources.map((s, idx) => {
                  const path = typeof s === "string" ? s : s.path;
                  const chance = typeof s === "object" && "chance" in s ? s.chance : undefined;
                  return (
                    <li
                      key={typeof s === "string" ? s : s.path || idx}
                      className="flex items-center justify-between gap-3 p-3 bg-secondary/50 border-2 border-border hover:bg-secondary transition"
                    >
                      <span className="flex-1 truncate text-foreground font-mono text-sm">{path}</span>
                      {chance !== undefined ? (
                        <span className="shrink-0 px-3 py-1 bg-primary/20 border-2 border-primary text-primary font-minecraft text-base">
                          {(chance * 100).toFixed(2)}%
                        </span>
                      ) : (
                        <span className="shrink-0 px-2 py-1 bg-muted border-2 border-border text-muted-foreground text-sm">
                          N/A
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-muted-foreground">
            Datapack Wiki • Fait par Poubone
          </p>
        </div>
      </footer>
    </div>
  );
}

