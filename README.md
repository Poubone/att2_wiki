# Datapack Wiki - Across the Time 2

Wiki interactif pour explorer les items du datapack Minecraft **Across the Time 2**.

## 📋 Description

Cette application web permet de parcourir, rechercher et filtrer tous les items disponibles dans le datapack Across the Time 2.
## ✨ Fonctionnalités

- 🔍 **Recherche avancée** : Recherche par nom, ID ou description
- 🎯 **Filtres multiples** : Filtrage par rareté, type, sous-type d'arme, boss
- 📊 **Tri personnalisable** : Tri par nom, rareté, type, etc.
- 📄 **Pagination** : Navigation efficace à travers de grandes listes d'items
- 🎨 **Interface Minecraft** : Design inspiré de Minecraft avec des polices et couleurs thématiques
- 📱 **Responsive** : Compatible avec tous les appareils

## 🛠️ Technologies

- **React 18** - Bibliothèque UI
- **TypeScript** - Typage statique
- **Vite** - Build tool et dev server
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Lucide React** - Icônes

## 📦 Installation

1. Installez les dépendances :
```bash
npm install
```

## 🚀 Utilisation

### Mode développement

Lancez le serveur de développement :
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173` (ou le port indiqué par Vite).

Le script `sync-items` s'exécutera automatiquement avant le démarrage pour synchroniser les données des items.

### Build de production

Pour créer une version de production :
```bash
npm run build
```

Les fichiers optimisés seront générés dans le dossier `dist/`.

### Prévisualisation du build

Pour prévisualiser le build de production localement :
```bash
npm run preview
```

## 📁 Structure du projet

```
web/
├── public/
│   ├── items.json      # Données des items (généré automatiquement)
│   └── favicon.png
├── src/
│   ├── components/     # Composants React réutilisables
│   ├── pages/          # Pages de l'application
│   ├── lib/            # Utilitaires et logique métier
│   └── types.ts        # Définitions TypeScript
├── scripts/
│   └── sync-items.mjs  # Script de synchronisation des items
└── package.json
```

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

Ce projet est privé et destiné à la communauté du datapack Across the Time 2.

---

Fait par Poubone
