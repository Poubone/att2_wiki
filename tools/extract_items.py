"""
Extraction des items depuis les loot tables d'un datapack Minecraft (ATT2).
Produit items.json (items dédupliqués avec display, enchantments, sources) et
optionnellement origins.json (bosses/elites avec zones et item_keys).

Enchantements : ils ne sont remplis que si le NBT de l'item (dans set_nbt de la
loot table) contient les listes "Enchantments" ou "StoredEnchantments". Si le
datapack applique les enchantements via une autre fonction (ex. enchant_randomly),
ils ne seront pas présents dans items.json.
"""
import argparse
import hashlib
import json
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

# Zones (régions) du datapack pour filtre / affichage
ZONES = [
    {"id": 1, "label": "Région 1"},
    {"id": 2, "label": "Région 2"},
    {"id": 3, "label": "Région 3"},
    {"id": 4, "label": "Région 4"},
]

# Regex partagées pour le parsing setdrop / drop (contexte monstre et leveling)
_RE_SETDROP = re.compile(
    r"tag=Reg(\d),.*?CLASSLEVEL=(\d+)\.\.(\d+)\}?\].*?drop/reg(\d)/p(\d+)"
)
_RE_SETDROP_SINGLE = re.compile(
    r"tag=Reg(\d),.*?CLASSLEVEL=(\d+)\}?\].*?drop/reg(\d)/p(\d+)"
)
_RE_SETDROP_OPEN = re.compile(
    r"tag=Reg(\d),.*?CLASSLEVEL=(\d+)\.\.\}?\].*?drop/reg(\d)/p(\d+)"
)
_RE_DROP = re.compile(r"GAMELEVEL=(\d+)\.\.(\d+)\}?\].*?DeathLootTable:\"(att2:[^\"]+)\"")
_RE_DROP_OPEN = re.compile(r"GAMELEVEL=(\d+)\.\.\}?\].*?DeathLootTable:\"(att2:[^\"]+)\"")
_RE_DEATH_LOOT_TABLE = re.compile(r'DeathLootTable:"(att2:[^"]+)"')

try:
    import nbtlib  # type: ignore

    _HAS_NBTLIB = True
except Exception:
    nbtlib = None  # type: ignore
    _HAS_NBTLIB = False


@dataclass(frozen=True)
class ExtractedItem:
    item_id: str
    nbt_snbt: str
    nbt_snbt_normalized: str
    rarity: Optional[str]
    equipment_type: Optional[str]
    display_name_raw: Optional[str]
    display_name_text: Optional[str]
    display_name_plain: Optional[str]
    display_name_color: Optional[str]  # couleur du nom (Minecraft: "gold", "blue", ou "#rrggbb")
    lore_raw: List[str]
    lore_text: List[str]
    lore_plain: List[str]
    enchantments: List[Dict[str, Any]]  # [{"id": "minecraft:sharpness", "lvl": 5}, ...]


def _read_json(path: Path) -> Any:
    # Some files may contain a UTF-8 BOM; utf-8-sig handles both.
    text = path.read_text(encoding="utf-8-sig")
    return json.loads(text)


def _iter_loot_table_files(root: Path) -> Iterable[Path]:
    data_dir = root / "data"
    if not data_dir.exists():
        return []
    for p in data_dir.rglob("*.json"):
        if "loot_tables" in p.parts:
            yield p


def _component_to_text(comp: Any) -> str:
    # Minimal text component flattener; good enough for Name/Lore like {"text":"..."}.
    if comp is None:
        return ""
    if isinstance(comp, str):
        return comp
    if isinstance(comp, list):
        return "".join(_component_to_text(x) for x in comp)
    if isinstance(comp, dict):
        base = str(comp.get("text", ""))
        extra = comp.get("extra")
        if isinstance(extra, list):
            base += "".join(_component_to_text(x) for x in extra)
        return base
    return str(comp)


_SECTION = chr(167)  # U+00A7
_MC_FORMATTING_RE = re.compile(re.escape(_SECTION) + r".")


def _strip_mc_formatting(s: Optional[str]) -> Optional[str]:
    if s is None:
        return None
    return _MC_FORMATTING_RE.sub("", s)


def _parse_text_component_json(s: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Returns (raw, text) where:
    - raw is the original string
    - text is a best-effort flattened version if raw is JSON text component
    """
    if s is None:
        return None, None
    raw = s
    try:
        parsed = json.loads(s)
    except Exception:
        return raw, raw
    return raw, _component_to_text(parsed)


def _get_scalar_value(val: Any) -> Any:
    """Retourne la valeur scalaire d'un tag nbtlib (String, Int, Short, etc.) ou la valeur telle quelle."""
    if val is None:
        return None
    if hasattr(val, "value"):
        return val.value
    return val


def _extract_enchantments_list(parsed_tag: Any, key: str) -> List[Dict[str, Any]]:
    """
    Extrait une liste d'enchantements depuis parsed_tag[key] (Enchantments ou StoredEnchantments).
    Chaque entrée est normalisée en {"id": "minecraft:xxx", "lvl": int}.
    """
    out: List[Dict[str, Any]] = []
    if not hasattr(parsed_tag, "get"):
        return out
    raw = parsed_tag.get(key)
    if not isinstance(raw, (list, tuple)):
        return out
    for entry in raw:
        get = getattr(entry, "get", None) if not isinstance(entry, dict) else entry.get
        if get is None:
            continue
        eid = _get_scalar_value(get("id"))
        lvl = _get_scalar_value(get("lvl"))
        if eid is None:
            continue
        id_str = str(eid).strip()
        if not id_str:
            continue
        lvl_int = int(lvl) if lvl is not None else 1
        out.append({"id": id_str, "lvl": max(1, min(255, lvl_int))})
    return out


def _extract_color_from_text_component(comp: Any) -> Optional[str]:
    """
    Extrait la première couleur d'un composant de texte Minecraft (Name/Lore).
    - comp peut être un dict avec "color" (nom ou hex "#rrggbb") ou "extra": [...]
    - Retourne le nom de couleur ("gold", "blue", ...) ou le hex.
    """
    if comp is None:
        return None
    if isinstance(comp, dict):
        color = comp.get("color")
        if isinstance(color, str) and color:
            return color
        for child in comp.get("extra") or []:
            out = _extract_color_from_text_component(child)
            if out:
                return out
        return None
    if isinstance(comp, list):
        for child in comp:
            out = _extract_color_from_text_component(child)
            if out:
                return out
    return None


def _parse_nbtlib(tag_snbt: str) -> Optional[Any]:
    if not tag_snbt or not _HAS_NBTLIB:
        return None
    try:
        return nbtlib.parse_nbt(tag_snbt)
    except Exception:
        return None


def _normalize_tag_for_dedupe(tag_snbt: str, parsed_tag: Any = None) -> str:
    """
    For dedupe, we try to canonicalize via nbtlib if possible; otherwise we
    just trim whitespace.
    """
    s = tag_snbt or ""
    if not s:
        return ""
    if _HAS_NBTLIB:
        try:
            tag = parsed_tag if parsed_tag is not None else nbtlib.parse_nbt(s)
            # nbtlib's str() output is stable enough for canonical SNBT here.
            return str(tag)
        except Exception:
            pass
    return " ".join(s.split())


def _rarity_has_digits(rarity: Optional[str]) -> bool:
    """Vérifie si une rareté contient des chiffres (ex: 'C1', 'R2', etc.)."""
    if not rarity:
        return False
    return bool(re.search(r'\d', rarity))


def _extract_chance_from_entry(entry: Dict[str, Any]) -> Optional[float]:
    """Extrait la probabilité depuis les conditions random_chance d'une entry."""
    conditions = entry.get("conditions")
    if not isinstance(conditions, list):
        return None
    for cond in conditions:
        if isinstance(cond, dict) and cond.get("condition") == "random_chance":
            chance = cond.get("chance")
            if isinstance(chance, (int, float)) and 0 <= chance <= 1:
                return float(chance)
    return None


def _extract_item_from_entry(entry: Dict[str, Any]) -> Optional[ExtractedItem]:
    if entry.get("type") != "item":
        return None
    item_id = entry.get("name")
    if not isinstance(item_id, str) or not item_id:
        return None

    tag_snbt = ""
    parsed_tag = None
    functions = entry.get("functions")
    if isinstance(functions, list):
        for fn in functions:
            if isinstance(fn, dict) and fn.get("function") == "set_nbt":
                tag = fn.get("tag")
                if isinstance(tag, str):
                    tag_snbt = tag
                    break

    if tag_snbt:
        parsed_tag = _parse_nbtlib(tag_snbt)
    normalized = _normalize_tag_for_dedupe(tag_snbt, parsed_tag=parsed_tag)
    rarity = None
    equipment_type = None
    display_name_raw = None
    display_name_text = None
    display_name_plain = None
    lore_raw: List[str] = []
    lore_text: List[str] = []
    lore_plain: List[str] = []
    display_name_color: Optional[str] = None

    # nbtlib tags have .value for scalars (String/Int/...), and dict/list behavior for containers.
    if isinstance(parsed_tag, dict):
        rarity_val = parsed_tag.get("Rarity")
        rarity_val = getattr(rarity_val, "value", rarity_val)
        if isinstance(rarity_val, str):
            rarity = rarity_val

        eq_val = parsed_tag.get("EquipmentType")
        eq_val = getattr(eq_val, "value", eq_val)
        if isinstance(eq_val, str):
            equipment_type = eq_val

        disp = parsed_tag.get("display")
        if isinstance(disp, dict):
            name_val = disp.get("Name")
            name_val = getattr(name_val, "value", name_val)
            if isinstance(name_val, str):
                display_name_raw, display_name_text = _parse_text_component_json(name_val)
                display_name_plain = _strip_mc_formatting(display_name_text)
                try:
                    name_parsed = json.loads(name_val)
                    display_name_color = _extract_color_from_text_component(name_parsed)
                except Exception:
                    pass

            lore_val = disp.get("Lore")
            if isinstance(lore_val, list):
                for line in lore_val:
                    line = getattr(line, "value", line)
                    if isinstance(line, str):
                        raw, txt = _parse_text_component_json(line)
                        if raw is not None:
                            lore_raw.append(raw)
                        if txt is not None:
                            lore_text.append(txt)
                            lore_plain.append(_strip_mc_formatting(txt) or "")

    enchantments: List[Dict[str, Any]] = []
    if parsed_tag is not None:
        seen: Set[Tuple[str, int]] = set()
        for enc in _extract_enchantments_list(parsed_tag, "Enchantments") + _extract_enchantments_list(parsed_tag, "StoredEnchantments"):
            key = (enc["id"], enc["lvl"])
            if key not in seen:
                seen.add(key)
                enchantments.append(enc)

    return ExtractedItem(
        item_id=item_id,
        nbt_snbt=tag_snbt,
        nbt_snbt_normalized=normalized,
        rarity=rarity,
        equipment_type=equipment_type,
        display_name_raw=display_name_raw,
        display_name_text=display_name_text,
        display_name_plain=display_name_plain,
        display_name_color=display_name_color,
        lore_raw=lore_raw,
        lore_text=lore_text,
        lore_plain=lore_plain,
        enchantments=enchantments,
    )


def _walk_entries(obj: Any) -> Iterable[Dict[str, Any]]:
    if isinstance(obj, dict):
        # Loot tables store entries under pools[*].entries[*], but scanning dicts
        # is robust and cheap for this dataset.
        if obj.get("type") == "item":
            yield obj
        for v in obj.values():
            yield from _walk_entries(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from _walk_entries(v)


def _stable_key(item_id: str, normalized_tag: str) -> str:
    sig = f"{item_id}|{normalized_tag or ''}"
    return hashlib.sha1(sig.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Loot context: monster (setdrop + drop) et boss (bats superelite/megaelite/dédiés)
# ---------------------------------------------------------------------------

def _parse_setdrop_reg_class_to_phase(setdrop_path: Path) -> List[Tuple[int, int, int, str]]:
    """
    Parse setdrop.mcfunction : (region, class_lo, class_hi, "regN/pPhase").
    Ignore les lignes contenant "asunarkstone".
    """
    result: List[Tuple[int, int, int, str]] = []
    if not setdrop_path.exists():
        return result
    for line in setdrop_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if "drop/reg" not in line or "asunarkstone" in line:
            continue
        for m in _RE_SETDROP.finditer(line):
            result.append((int(m.group(1)), int(m.group(2)), int(m.group(3)), f"reg{m.group(4)}/p{m.group(5)}"))
        for m in _RE_SETDROP_SINGLE.finditer(line):
            r, cl, r2, p = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))
            result.append((r, cl, cl, f"reg{r2}/p{p}"))
        for m in _RE_SETDROP_OPEN.finditer(line):
            result.append((int(m.group(1)), int(m.group(2)), 99, f"reg{m.group(3)}/p{m.group(4)}"))
    return result


def _loot_path_to_table_id(path_rel: str) -> Optional[str]:
    """
    Convertit un chemin relatif de loot table en ID Minecraft (ex. att2:entities/regular/reg2l1t3).
    path_rel ex: "data/att2/loot_tables/entities/regular/reg2l1t3.json"
    """
    if not path_rel.endswith(".json") or "loot_tables" not in path_rel:
        return None
    parts = path_rel.replace("\\", "/").split("/")
    try:
        idx = parts.index("loot_tables")
        if idx + 1 >= len(parts):
            return None
        namespace = parts[idx - 1]  # att2
        # Inclure le nom du fichier sans .json: entities/boss/coins_rewards
        subparts = parts[idx + 1 :]
        subpath = "/".join(p.replace(".json", "") for p in subparts)
        return f"{namespace}:{subpath}"
    except ValueError:
        pass
    return None


def _build_monster_contexts(functions_root: Path) -> Dict[str, List[Dict[str, Any]]]:
    """
    Associe chaque table entities/regular (reg*l*t*) à (region, classlevel_range, gamelevel_range).
    Retour: table_id -> [ { region, classlevel_range, gamelevel_range, summary }, ... ]
    """
    out: Dict[str, List[Dict[str, Any]]] = {}
    loot_dir = functions_root / "data" / "att2" / "functions" / "gameplay" / "leveling"
    setdrop_path = loot_dir / "monster" / "loot" / "setdrop.mcfunction"
    reg_class_to_phase = _parse_setdrop_reg_class_to_phase(setdrop_path)
    drop_dir = loot_dir / "drop"

    for reg, cl_lo, cl_hi, phase in reg_class_to_phase:
        fn = (drop_dir / phase).with_suffix(".mcfunction")
        if not fn.exists():
            continue
        for line in fn.read_text(encoding="utf-8").splitlines():
            for m in _RE_DROP.finditer(line):
                g_lo, g_hi, table_id = int(m.group(1)), int(m.group(2)), m.group(3)
                if table_id not in out:
                    out[table_id] = []
                out[table_id].append({
                    "region": reg,
                    "classlevel_range": [cl_lo, cl_hi],
                    "gamelevel_range": [g_lo, g_hi],
                    "summary": f"Région {reg}, CLASS {cl_lo}-{cl_hi}, GAMELEVEL {g_lo}-{g_hi}",
                })
            for m in _RE_DROP_OPEN.finditer(line):
                g_lo, table_id = int(m.group(1)), m.group(2)
                if table_id not in out:
                    out[table_id] = []
                out[table_id].append({
                    "region": reg,
                    "classlevel_range": [cl_lo, cl_hi],
                    "gamelevel_range": [g_lo, None],
                    "summary": f"Région {reg}, CLASS {cl_lo}-{cl_hi}, GAMELEVEL {g_lo}+",
                })
    return out


def _build_class_to_leveling_tables(functions_root: Path) -> Dict[Tuple[int, int], List[str]]:
    """
    (region, class_level) -> [table_id] pour le leveling (setdrop + drop/regN/p*).
    Les bats boss avec tags CLASS/Reg reçoivent une de ces tables via setdrop selon GAMELEVEL.
    """
    out: Dict[Tuple[int, int], List[str]] = {}
    loot_dir = functions_root / "data" / "att2" / "functions" / "gameplay" / "leveling"
    setdrop_path = loot_dir / "monster" / "loot" / "setdrop.mcfunction"
    reg_class_to_phase = _parse_setdrop_reg_class_to_phase(setdrop_path)
    drop_dir = loot_dir / "drop"
    phase_to_tables: Dict[str, List[str]] = {}

    for _reg, cl_lo, cl_hi, phase in reg_class_to_phase:
        if phase in phase_to_tables:
            continue
        fn = (drop_dir / phase).with_suffix(".mcfunction")
        if not fn.exists():
            continue
        tables: List[str] = []
        for line in fn.read_text(encoding="utf-8").splitlines():
            for m in _RE_DROP.finditer(line):
                tables.append(m.group(3))
            for m in _RE_DROP_OPEN.finditer(line):
                tables.append(m.group(2))
        phase_to_tables[phase] = list(dict.fromkeys(tables))

    for reg, cl_lo, cl_hi, phase in reg_class_to_phase:
        tables = phase_to_tables.get(phase, [])
        for cl in range(cl_lo, min(cl_hi + 1, 22)):
            out[(reg, cl)] = tables
    return out


def _get_bat_leveling_class_reg(bat_mcfunction_path: Path) -> Optional[Tuple[int, int]]:
    """
    Si la bat n'a pas de DeathLootTable et a des tags CLASS/Reg, retourne (region, class).
    Sinon None. Les bats de récompenses boss avec LVL0, CLASS20, Reg1 reçoivent ensuite
    leur table via setdrop (système leveling).
    """
    if not bat_mcfunction_path.exists():
        return None
    text = bat_mcfunction_path.read_text(encoding="utf-8")
    if "DeathLootTable:" in text:
        return None
    m_reg = re.search(r'"Reg(\d+)"', text)
    m_class = re.search(r'"CLASS(\d+)"', text)
    if m_reg and m_class:
        return (int(m_reg.group(1)), int(m_class.group(1)))
    return None


def _build_bat_to_table(functions_root: Path) -> Dict[str, List[str]]:
    """
    Pour chaque bat_*_rewards.mcfunction, lit toutes les DeathLootTable du summon.
    Retour: nom_fonction -> [table_id, ...] (plusieurs si le fichier invoque plusieurs types de bats)
    """
    out: Dict[str, List[str]] = {}
    summon_dir = functions_root / "data" / "att2" / "functions" / "summon"
    if not summon_dir.exists():
        return out

    def add_tables(name: str, text: str) -> None:
        tables = list(dict.fromkeys(m.group(1) for m in _RE_DEATH_LOOT_TABLE.finditer(text)))
        if tables:
            out[name] = tables

    for f in summon_dir.rglob("*.mcfunction"):
        name = f.stem
        if "reward" not in name.lower():
            continue
        add_tables(name, f.read_text(encoding="utf-8"))
    for sub in ("reg_1", "reg_2", "reg_3", "reg_4"):
        reg_dir = summon_dir / sub
        if not reg_dir.exists():
            continue
        for f in reg_dir.glob("*_rewards_dedicated.mcfunction"):
            add_tables(f.stem, f.read_text(encoding="utf-8"))
    for f in summon_dir.glob("bat_*_rewards.mcfunction"):
        add_tables(f.stem, f.read_text(encoding="utf-8"))
    return out


def _build_boss_contexts_and_index(
    functions_root: Path,
    bat_to_table: Dict[str, List[str]],
) -> Tuple[Dict[str, List[Dict[str, Any]]], List[Dict[str, Any]]]:
    """
    Pour chaque loot table, liste les contextes "boss" (superelite, megaelite, dédié).
    Et construit la liste des bosses (index) pour le filtre wiki.
    Retour: (table_id -> [ boss_contexts ], bosses_list)
    """
    table_to_bosses: Dict[str, List[Dict[str, Any]]] = {}
    bosses_list: List[Dict[str, Any]] = []

    def add_boss(boss_id: str, label: str, btype: str, tables: List[str], **kwargs: Any) -> None:
        bosses_list.append({
            "id": boss_id,
            "label": label,
            "type": btype,
            "tables": tables,
            **kwargs,
        })
        for t in tables:
            if t not in table_to_bosses:
                table_to_bosses[t] = []
            table_to_bosses[t].append({"boss_id": boss_id, "label": label, "type": btype, **kwargs})

    # Superelite / Megaelite: loot_classX_regY.mcfunction appelle des bat_*
    _re_func = re.compile(r"function att2:summon/(bat_[a-z0-9_]+_rewards)")
    for kind, folder in (("superelite", "superelite"), ("megaelite", "megaelite")):
        loot_dir = functions_root / "data" / "att2" / "functions" / "gameplay" / "leveling" / "monster" / folder
        if not loot_dir.exists():
            continue
        for f in loot_dir.glob("loot_class*_reg*.mcfunction"):
            # loot_class20_reg2.mcfunction -> class 20, reg 2
            mm = re.match(r"loot_class(\d+)_reg(\d+)", f.stem)
            if not mm:
                continue
            cl, reg = int(mm.group(1)), int(mm.group(2))
            boss_id = f"{kind}_{cl}_{reg}"
            label = f"{kind.capitalize()} CLASS {cl} Reg{reg}"
            bats_called: List[str] = []
            for line in f.read_text(encoding="utf-8").splitlines():
                for m in _re_func.finditer(line):
                    bats_called.append(m.group(1))
            tables = [t for b in bats_called for t in (bat_to_table.get(b) or [])]
            tables = list(dict.fromkeys(tables))
            add_boss(boss_id, label, kind, tables, class_level=cl, zone=reg, region=reg)

    # Boss dédiés: *_rewards_dedicated.mcfunction + toutes les loot tables des bats appelés dans le fichier "rewards" du boss
    summon_dir = functions_root / "data" / "att2" / "functions"
    functions_data = summon_dir  # data/att2/functions
    _re_summon_call = re.compile(r"function att2:summon/([^\s\n]+)")

    def _find_rewards_file_for_dedicated(dedicated_stem: str, boss_name: str) -> Optional[Path]:
        """Trouve le .mcfunction (rewards) qui appelle ce *_rewards_dedicated."""
        # 1) Chemin explicite: gameplay/boss/schestrown/{boss_name}/rewards.mcfunction
        explicit = functions_data / "gameplay" / "boss" / "schestrown" / boss_name / "rewards.mcfunction"
        if explicit.exists():
            try:
                if dedicated_stem in explicit.read_text(encoding="utf-8"):
                    return explicit
            except Exception:
                pass
        # 2) Fallback: premier fichier (hors dedicated) qui contient l'appel
        for mcf in functions_data.rglob("*.mcfunction"):
            if mcf.stem == dedicated_stem:
                continue
            try:
                text = mcf.read_text(encoding="utf-8")
                if dedicated_stem in text and "function att2:summon/" in text:
                    return mcf
            except Exception:
                continue
        return None

    def _collect_tables_from_rewards_file(rewards_path: Path, bat_to_table: Dict[str, List[str]]) -> List[str]:
        """Extrait toutes les loot tables des appels function att2:summon/... dans ce fichier."""
        text = rewards_path.read_text(encoding="utf-8")
        tables: List[str] = []
        seen: Set[str] = set()
        for m in _re_summon_call.finditer(text):
            call_path = m.group(1).strip()
            func_stem = call_path.replace("\\", "/").split("/")[-1]
            for table_id in bat_to_table.get(func_stem) or []:
                if table_id not in seen:
                    seen.add(table_id)
                    tables.append(table_id)
        return tables

    # Tables communes à tous les bosses (rewards_start est appelé avant le rewards spécifique de chaque boss)
    rewards_start_path = functions_data / "gameplay" / "boss" / "rewards_start.mcfunction"
    rewards_start_tables: List[str] = []
    if rewards_start_path.exists():
        rewards_start_tables = _collect_tables_from_rewards_file(rewards_start_path, bat_to_table)

    # (region, class) -> tables du leveling (setdrop) : les bats boss avec LVL0/CLASS/Reg reçoivent une de ces tables
    class_to_leveling_tables = _build_class_to_leveling_tables(functions_root)

    for sub in ("reg_1", "reg_2", "reg_3", "reg_4"):
        reg_dir = summon_dir / "summon" / sub
        if not reg_dir.exists():
            continue
        zone_id = int(sub.split("_")[1])
        for f in reg_dir.glob("*_rewards_dedicated.mcfunction"):
            boss_name = f.stem.replace("_rewards_dedicated", "")
            dedicated_stem = f.stem
            dedicated_tables = bat_to_table.get(dedicated_stem)
            if not dedicated_tables:
                text = f.read_text(encoding="utf-8")
                dedicated_tables = list(dict.fromkeys(m.group(1) for m in _RE_DEATH_LOOT_TABLE.finditer(text)))
                if not dedicated_tables:
                    continue
            all_tables: List[str] = list(dedicated_tables)
            rewards_file = _find_rewards_file_for_dedicated(dedicated_stem, boss_name)
            if rewards_file:
                extra = _collect_tables_from_rewards_file(rewards_file, bat_to_table)
                for t in extra:
                    if t not in all_tables:
                        all_tables.append(t)
            for t in rewards_start_tables:
                if t not in all_tables:
                    all_tables.append(t)
            # Bats "X_rewards" (sans DeathLootTable) reçoivent leur table via initnewmonster -> setdrop (CLASS/Reg)
            leveling_bat_path = reg_dir / f"{boss_name}_rewards.mcfunction"
            leveling_rc = _get_bat_leveling_class_reg(leveling_bat_path)
            if leveling_rc:
                for t in class_to_leveling_tables.get(leveling_rc, []):
                    if t not in all_tables:
                        all_tables.append(t)
            label = f"Boss {boss_name.replace('_', ' ').title()}"
            add_boss(f"dedicated_{boss_name}", label, "boss_dedicated", all_tables, zone=zone_id, boss_name=boss_name)
    # weaponsking à la racine (pas de zone associée)
    wk = summon_dir / "summon" / "bat_weaponsking_rewards.mcfunction"
    if wk.exists() and bat_to_table.get("bat_weaponsking_rewards"):
        add_boss("dedicated_weaponsking", "Boss Weaponsking", "boss_dedicated", bat_to_table["bat_weaponsking_rewards"], boss_name="weaponsking")

    return table_to_bosses, bosses_list


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Extrait tous les items obtenables via les loot tables d'un datapack (dédupliqués)."
    )
    parser.add_argument("--root", default=".", help="Racine du projet (contient pack.mcmeta et data/)")
    parser.add_argument(
        "--functions-root",
        default=None,
        help="Racine du datapack fonctions (ex. adventquest_functions). Si absent, pas d'enrichissement boss/monstre.",
    )
    parser.add_argument("--out", default="items.json", help="Chemin du JSON items (global)")
    parser.add_argument(
        "--out-origins",
        default=None,
        help="Chemin du JSON origines (bosses + elites). Défaut: même répertoire que --out, fichier origins.json",
    )
    parser.add_argument(
        "--pretty", action="store_true", help="Sortie JSON indentée (plus lisible, plus grosse)"
    )
    parser.add_argument(
        "--no-sources",
        action="store_true",
        help="Ne pas inclure la liste des loot tables source pour chaque item",
    )
    parser.add_argument(
        "--include-nbt",
        action="store_true",
        help="Inclure aussi le SNBT brut dans la sortie (utile pour debug/wiki)",
    )
    parser.add_argument(
        "--progress-every",
        type=int,
        default=25,
        help="Afficher un message de progression toutes les N loot tables (0 = silencieux)",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    out_path = Path(args.out).resolve()

    pack_meta = None
    pack_path = root / "pack.mcmeta"
    if pack_path.exists():
        try:
            pack_meta = _read_json(pack_path)
        except Exception:
            pack_meta = None

    loot_files = list(_iter_loot_table_files(root))
    items_by_key: Dict[str, Dict[str, Any]] = {}

    tables_parsed = 0
    item_refs_total = 0
    t0 = time.time()

    for i, lt_path in enumerate(loot_files, start=1):
        lt_rel = lt_path.relative_to(root).as_posix()
        data = _read_json(lt_path)
        tables_parsed += 1
        if args.progress_every and (i == 1 or i % args.progress_every == 0 or i == len(loot_files)):
            elapsed = time.time() - t0
            rate = i / elapsed if elapsed > 0 else 0.0
            print(f"[{i}/{len(loot_files)}] {lt_rel} ({rate:.1f} tables/s)", file=sys.stderr)

        for entry in _walk_entries(data):
            extracted = _extract_item_from_entry(entry)
            if not extracted:
                continue
            
            # Filtrer les items avec des raretés contenant des chiffres (ex: "C1")
            if _rarity_has_digits(extracted.rarity):
                continue
            
            item_refs_total += 1
            chance = _extract_chance_from_entry(entry)

            k = _stable_key(extracted.item_id, extracted.nbt_snbt_normalized)
            rec = items_by_key.get(k)
            if rec is None:
                rec = {
                    "key": k,
                    "item_id": extracted.item_id,
                    "rarity": extracted.rarity,
                    "equipment_type": extracted.equipment_type,
                    "display": {
                        "name_raw": extracted.display_name_raw,
                        "name_text": extracted.display_name_text,
                        "name_plain": extracted.display_name_plain,
                        "name_color": extracted.display_name_color,
                        "lore_raw": extracted.lore_raw,
                        "lore_text": extracted.lore_text,
                        "lore_plain": extracted.lore_plain,
                    },
                    "enchantments": extracted.enchantments,
                }
                if args.include_nbt:
                    rec["nbt_snbt"] = extracted.nbt_snbt or ""
                if not args.no_sources:
                    rec["sources"] = []
                items_by_key[k] = rec

            if not args.no_sources:
                # Stocker la source avec sa probabilité si disponible
                source_entry = {"path": lt_rel}
                if chance is not None:
                    source_entry["chance"] = chance
                rec["sources"].append(source_entry)

    items = list(items_by_key.values())
    if not args.no_sources:
        for rec in items:
            # Trier les sources par chemin, puis par probabilité (décroissante) si disponible
            rec["sources"].sort(key=lambda s: (s.get("path", ""), -(s.get("chance", 0) or 0)))

    # Enrichissement: contexte monstre (setdrop+drop), boss/elites (bats), origine (type + zone)
    functions_root = Path(args.functions_root).resolve() if args.functions_root else None
    monster_contexts: Dict[str, List[Dict[str, Any]]] = {}
    boss_table_contexts: Dict[str, List[Dict[str, Any]]] = {}
    origins_index: List[Dict[str, Any]] = []
    table_to_item_keys: Dict[str, Set[str]] = {}

    if functions_root and functions_root.exists() and not args.no_sources:
        monster_contexts = _build_monster_contexts(functions_root)
        bat_to_table = _build_bat_to_table(functions_root)
        boss_table_contexts, origins_index = _build_boss_contexts_and_index(functions_root, bat_to_table)

        for rec in items:
            item_key = rec["key"]
            dropped_by_origin_ids: List[str] = []
            for src in rec.get("sources") or []:
                path_rel = src.get("path", "")
                table_id = _loot_path_to_table_id(path_rel)
                if table_id:
                    table_to_item_keys.setdefault(table_id, set()).add(item_key)
                if not table_id:
                    continue
                ctx_m = monster_contexts.get(table_id)
                ctx_b = boss_table_contexts.get(table_id)

                if ctx_m:
                    src["monster_contexts"] = ctx_m
                    src["origin_type"] = "monster"
                    src["zone"] = ctx_m[0].get("region")
                if ctx_b:
                    src["boss_contexts"] = ctx_b
                    first = ctx_b[0]
                    src["origin_type"] = first.get("type", "boss_dedicated")  # superelite, megaelite, boss_dedicated
                    src["zone"] = first.get("zone") or first.get("region")
                    for b in ctx_b:
                        bid = b.get("boss_id")
                        if bid and bid not in dropped_by_origin_ids:
                            dropped_by_origin_ids.append(bid)

                if not ctx_m and not ctx_b:
                    # Inférer origine depuis le chemin
                    if "entities/boss" in path_rel:
                        src["origin_type"] = "boss_dedicated"
                    elif "entities/regular" in path_rel:
                        src["origin_type"] = "monster"
                    elif "chest" in path_rel:
                        src["origin_type"] = "chest"
                    elif "gambling" in path_rel:
                        src["origin_type"] = "gambling"
                    else:
                        src["origin_type"] = "other"
                    parts_path = path_rel.replace("\\", "/").split("/")
                    if "reg1" in parts_path or "reg_1" in parts_path:
                        src["zone"] = 1
                    elif "reg2" in parts_path or "reg_2" in parts_path:
                        src["zone"] = 2
                    elif "reg3" in parts_path or "reg_3" in parts_path:
                        src["zone"] = 3
                    elif "reg4" in parts_path or "reg_4" in parts_path:
                        src["zone"] = 4

            if dropped_by_origin_ids:
                rec["dropped_by_bosses"] = sorted(dropped_by_origin_ids)

    # Tri stable utile pour git diffs / navigation
    items.sort(key=lambda r: (r.get("item_id") or "", r.get("display", {}).get("name_text") or "", r["key"]))

    # Fichier items.json (global)
    out = {
        "pack": pack_meta.get("pack") if isinstance(pack_meta, dict) else None,
        "stats": {
            "tables_parsed": tables_parsed,
            "item_refs_total": item_refs_total,
            "items_unique": len(items),
            "nbtlib_available": _HAS_NBTLIB,
        },
        "items": items,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if args.pretty:
        out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    else:
        out_path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"OK items: {tables_parsed} loot tables, {len(items)} items uniques -> {out_path}")

    # Fichier origins.json (bosses + elites : ce que peut loot chaque boss/elite, avec zones)
    if origins_index and not args.no_sources:
        for o in origins_index:
            keys: Set[str] = set()
            for t in o.get("tables") or []:
                keys.update(table_to_item_keys.get(t, set()))
            o["item_keys"] = sorted(keys)
        origins_path = Path(args.out_origins) if args.out_origins else out_path.parent / "origins.json"
        origins_path = origins_path.resolve()
        origins_out = {
            "zones": ZONES,
            "origins": origins_index,
        }
        origins_path.parent.mkdir(parents=True, exist_ok=True)
        if args.pretty:
            origins_path.write_text(json.dumps(origins_out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        else:
            origins_path.write_text(json.dumps(origins_out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        print(f"OK origins: {len(origins_index)} origines (bosses + elites) -> {origins_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

