export type ItemDisplay = {
  name_raw?: string | null;
  name_text?: string | null;
  name_plain?: string | null;
  lore_raw?: string[] | null;
  lore_text?: string[] | null;
  lore_plain?: string[] | null;
};

export type ItemSource = {
  path: string;
  chance?: number;
};

export type ItemRecord = {
  key: string;
  item_id: string;
  rarity?: string | null;
  equipment_type?: string | null;
  display?: ItemDisplay | null;
  sources?: ItemSource[] | null;
  nbt_snbt?: string | null;
};

export type ItemsFile = {
  pack?: unknown;
  stats?: {
    tables_parsed?: number;
    item_refs_total?: number;
    items_unique?: number;
    nbtlib_available?: boolean;
  };
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

