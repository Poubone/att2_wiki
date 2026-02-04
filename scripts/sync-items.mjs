import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..");

const src = path.join(repoRoot, "items.json");
const destDir = path.join(webRoot, "public");
const dest = path.join(destDir, "items.json");

if (!fs.existsSync(src)) {
  console.warn(
    `[sync-items] items.json introuvable à la racine du repo: ${src}`
  );
  console.warn(
    `[sync-items] Utilisation du fichier existant dans public/ si disponible, sinon création d'un fichier vide.`
  );
  
  // Si le fichier de destination existe déjà, on le garde
  if (fs.existsSync(dest)) {
    console.log(`[sync-items] Fichier ${path.relative(webRoot, dest)} déjà présent, conservé.`);
    process.exit(0);
  }
  
  // Sinon, créer un fichier vide pour éviter les erreurs
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(dest, JSON.stringify([], null, 2));
  console.log(`[sync-items] Fichier vide créé: ${path.relative(webRoot, dest)}`);
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`[sync-items] OK: ${path.relative(webRoot, dest)} mis à jour depuis ${path.relative(webRoot, src)}`);

