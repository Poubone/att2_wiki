# 🎮 Datapack Wiki — Across the Time 2

> Wiki interactif pour explorer les items du datapack Minecraft **Across the Time 2** : armes, armures, consommables, sources de drop, boss et enchantements.

---

## ✨ Aperçu

Une application web pour parcourir, rechercher et filtrer tous les items du datapack, avec **11 langues**, des **drapeaux** pour la langue, et une interface au style Minecraft.

---

## 🚀 Démarrage rapide

```bash
npm install
npm run dev
```

Ouvre **http://localhost:3000** dans ton navigateur.

> 💡 Les données (`items.json` / `origins.json`) doivent être générées par le script Python si tu pars de zéro — voir la section [📦 Données](#-données-items--origines) plus bas.

---

## 📋 Fonctionnalités

| | |
|---|---|
| 🔍 | **Recherche** — par nom, ID ou description |
| 🎯 | **Filtres** — rareté, type, zone (région), boss |
| 📊 | **Tri** — nom, rareté, nb de sources, nb de boss (asc/desc) |
| 📄 | **Pagination** — navigation dans la liste d’items |
| 📖 | **Page détail** — nom, lore, stats (base + set), enchantements, sources, contexte monstre/boss, probabilités |
| 🌐 | **Multilingue** — 11 langues (FR, EN, ZH, JA, KO, AR, RU, ES, DE, HI, PT) avec drapeaux SVG |
| 🎨 | **Interface** — style Minecraft (police, couleurs de rareté, RTL pour l’arabe) |
| 📱 | **Responsive** — mobile et desktop |

---

## 🛠️ Technologies

- **React 18** & **TypeScript**
- **Vite** — build & dev server
- **React Router** — navigation
- **Tailwind CSS** — styles
- **i18next** — internationalisation
- **Lucide React** — icônes
- **flag-icons** — drapeaux pour le sélecteur de langue

---

## 📦 Installation & commandes

### Installation

```bash
npm install
```

### Lancer le site en dev

```bash
npm run dev
```

Le site est servi sur **http://localhost:3000** (ou le port affiché).  
Le script `sync-items` s’exécute avant le démarrage et conserve `public/items.json` s’il existe déjà.

### Build & prévisualisation

```bash
npm run build
npm run preview
```

Les fichiers de production sont dans `dist/`.

---

## 📦 Données (items & origines)

Les données affichées viennent de :

- **`public/items.json`** — liste des items (clé, item_id, rareté, display, sources, enchantments, etc.)
- **`public/origins.json`** — origines (bosses / élites) et zones pour les filtres

### 🔧 Générer ou mettre à jour les données

À la racine du projet (où se trouvent `tools/` et les dossiers du datapack) :

```bash
python tools/extract_items.py \
  --root adventquest_loot_tables \
  --functions-root adventquest_functions \
  --out public/items.json \
  --out-origins public/origins.json
```

| Option | Description |
|--------|-------------|
| `--root` | Racine du datapack avec `data/.../loot_tables/` |
| `--functions-root` | Racine du datapack des fonctions (sources, bosses, zones) |
| `--out` | Fichier de sortie pour les items (ex. `public/items.json`) |
| `--out-origins` | Fichier de sortie pour les origines (ex. `public/origins.json`) |
| `--pretty` | JSON indenté (plus lisible, écriture plus lente) |
| `--no-sources` | Ne pas inclure les sources ni générer origins |
| `--include-nbt` | Ajouter le SNBT brut par item (debug) |

Le script lit les loot tables, déduplique les items par `item_id` + NBT, et remplit **display** (name, lore), **enchantments** (si présents dans le NBT), et les sources / origines.

> **Enchantements** — Ils n’apparaissent que si le NBT de l’item dans la loot table contient `Enchantments` ou `StoredEnchantments`. Les enchantements appliqués via `enchant_randomly` ou autre ne sont pas extraits.

**Prérequis** : Python 3. Optionnel : `pip install nbtlib` pour une meilleure normalisation du NBT.

---

## 📁 Structure du projet

```
├── public/
│   ├── items.json       # Données items (générées par le script Python)
│   ├── origins.json     # Bosses / origines (généré par le script)
│   └── favicon.png
├── src/
│   ├── components/      # ItemCard, LanguageSwitcher, MinecraftText, etc.
│   ├── pages/           # ItemsPage, ItemDetailPage
│   ├── lib/             # items, rarity, stats, sets, etc.
│   ├── locales/         # Traductions (fr, en, zh, ja, ko, ar, ru, es, de, hi, pt)
│   ├── i18n.ts          # Config i18next
│   └── types.ts         # ItemRecord, EnrichedItem, etc.
├── tools/
│   └── extract_items.py # Extraction loot tables → items.json + origins.json
├── scripts/
│   └── sync-items.mjs   # Sync items (predev) : garde public/ si présent
├── package.json
└── README.md
```

Les dossiers `adventquest_functions/`, `adventquest_loot_tables/`, `minecraft-item-wiki/` sont dans le `.gitignore`.

---

## 🤝 Contribution

Les contributions sont les bienvenues — n’hésite pas à ouvrir une issue ou une pull request.

---

## 📄 Licence

Projet privé pour la communauté du datapack **Across the Time 2**.

— **Fait par Poubone** 🎮
