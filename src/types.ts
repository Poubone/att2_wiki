export type ItemDisplay = {
  name_raw?: string | null;
  name_text?: string | null;
  name_plain?: string | null;
  /** Couleur du nom (Minecraft: "gold", "blue", ou "#rrggbb") */
  name_color?: string | null;
  lore_raw?: string[] | null;
  lore_text?: string[] | null;
  lore_plain?: string[] | null;
};

export type MonsterContext = {
  region?: number;
  classlevel_range?: [number, number];
  gamelevel_range?: [number, number | null];
  summary?: string;
};

export type ItemSource = {
  path: string;
  chance?: number;
  origin_type?: string;
  zone?: number;
  monster_contexts?: MonsterContext[];
};

export type BossEntry = {
  id: string;
  label: string;
  type?: string;
  tables?: string[];
  class_level?: number;
  region?: number;
};

export type ZoneEntry = {
  id: number;
  label: string;
};

export type OriginEntry = {
  id: string;
  label: string;
  type?: string;
  tables?: string[];
  class_level?: number;
  zone?: number;
  region?: number;
  item_keys?: string[];
};

export type OriginsFile = {
  zones: ZoneEntry[];
  origins: OriginEntry[];
};

export type ItemEnchantment = {
  id: string;
  lvl: number;
};

export type ItemRecord = {
  key: string;
  item_id: string;
  rarity?: string | null;
  equipment_type?: string | null;
  display?: ItemDisplay | null;
  sources?: ItemSource[] | null;
  dropped_by_bosses?: string[] | null;
  nbt_snbt?: string | null;
  enchantments?: ItemEnchantment[] | null;
};

export type ItemsFile = {
  pack?: unknown;
  stats?: {
    tables_parsed?: number;
    item_refs_total?: number;
    items_unique?: number;
    nbtlib_available?: boolean;
  };
  bosses?: BossEntry[];
  items: ItemRecord[];
};

export type EnrichedItem = ItemRecord & {
  labelName: string;
  bosses: string[];
  typeKey: string;
  weaponSubtype?: string | null;
  sourcesCount: number;
  bossesCount: number;
};

