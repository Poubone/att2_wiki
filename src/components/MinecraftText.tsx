import type { ReactNode } from "react";

/** Couleurs § (Minecraft) → hex. Utilisé pour le nom et pour l’icône (même couleur). */
export const MC_COLORS: Record<string, string> = {
  "0": "#000000", // noir
  "1": "#0000AA", // bleu foncé
  "2": "#00AA00", // vert foncé
  "3": "#00AAAA", // bleu-vert
  "4": "#AA0000", // rouge foncé
  "5": "#AA00AA", // violet
  "6": "#FFAA00", // or
  "7": "#AAAAAA", // gris
  "8": "#555555", // gris foncé
  "9": "#5555FF", // bleu
  a: "#55FF55", // vert
  b: "#55FFFF", // cyan
  c: "#FF5555", // rouge
  d: "#FF55FF", // rose
  e: "#FFFF55", // jaune
  f: "#FFFFFF", // blanc
};

const SECTION = "\u00A7"; // §

/**
 * Retourne la première couleur (hex) trouvée dans un texte avec codes §, comme pour le nom affiché.
 * Utilisé pour appliquer la même couleur à l’icône.
 */
export function getFirstColorFromMinecraftText(text: string | null | undefined): string | null {
  if (!text || typeof text !== "string") return null;
  let i = 0;
  while (i < text.length) {
    if ((text[i] === SECTION || text[i] === "\u00A7") && i + 1 < text.length) {
      const code = text[i + 1].toLowerCase();
      if (MC_COLORS[code]) return MC_COLORS[code];
      i += 2;
    } else {
      i++;
    }
  }
  return null;
}

type FormatState = {
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
};

function parseMinecraftText(text: string): ReactNode[] {
  if (!text) return [];
  const parts: ReactNode[] = [];
  let currentText = "";
  let state: FormatState = {};

  let i = 0;
  while (i < text.length) {
    const char = text[i];
    // Vérifier si c'est le caractère § (U+00A7) ou sa représentation en bytes
    if ((char === SECTION || char === "\u00A7") && i + 1 < text.length) {
      // Sauvegarder le texte accumulé avant le code
      if (currentText) {
        parts.push(
          <span
            key={parts.length}
            style={{
              color: state.color,
              fontWeight: state.bold ? "bold" : undefined,
              fontStyle: state.italic ? "italic" : undefined,
              textDecoration: state.underline
                ? "underline"
                : state.strikethrough
                  ? "line-through"
                  : undefined,
            }}
          >
            {currentText}
          </span>
        );
        currentText = "";
      }

      const code = text[i + 1].toLowerCase();
      i += 2;

      if (code === "r") {
        // Reset
        state = {};
      } else if (code === "l") {
        state.bold = true;
      } else if (code === "m") {
        state.strikethrough = true;
      } else if (code === "n") {
        state.underline = true;
      } else if (code === "o") {
        state.italic = true;
      } else if (MC_COLORS[code]) {
        state.color = MC_COLORS[code];
        // Reset les formats quand on change de couleur (comportement Minecraft)
        state.bold = false;
        state.italic = false;
        state.underline = false;
        state.strikethrough = false;
      }
    } else {
      currentText += char;
      i++;
    }
  }

  // Ajouter le texte restant
  if (currentText) {
    parts.push(
      <span
        key={parts.length}
        style={{
          color: state.color,
          fontWeight: state.bold ? "bold" : undefined,
          fontStyle: state.italic ? "italic" : undefined,
          textDecoration: state.underline
            ? "underline"
            : state.strikethrough
              ? "line-through"
              : undefined,
        }}
      >
        {currentText}
      </span>
    );
  }

  return parts.length > 0 ? parts : [text];
}

export function MinecraftText({
  text,
  className,
}: {
  text?: string | null;
  className?: string;
}) {
  if (!text) return null;
  return <span className={className}>{parseMinecraftText(text)}</span>;
}
