/**
 * Détecte si un item fait partie d'un set et extrait le nom du set si possible.
 */

/**
 * Nettoie le texte en enlevant les codes de formatage Minecraft
 */
function stripFormatting(text: string): string {
  return text.replace(/\u00A7./g, "");
}

/**
 * Extrait le nom du set depuis une ligne de texte
 */
function extractSetNameFromText(text: string): string | null {
  const clean = stripFormatting(text).toLowerCase();
  
  // Patterns pour détecter les sets :
  // - "Set: Nom du set"
  // - "du set Nom du set"
  // - "set Nom du set"
  // - "Set Nom du set"
  
  const patterns = [
    /set\s*:?\s*([^,\.\n]+)/i,
    /du\s+set\s+([^,\.\n]+)/i,
    /set\s+de\s+([^,\.\n]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match && match[1]) {
      const setName = match[1].trim();
      // Nettoyer le nom du set (enlever les caractères spéciaux en fin)
      return setName.replace(/[.,;:!?]+$/, "").trim();
    }
  }
  
  return null;
}

/**
 * Détecte si un item fait partie d'un set et retourne le nom du set si trouvé
 */
export function detectSet(item: {
  display?: {
    name_text?: string | null;
    name_plain?: string | null;
    lore_text?: string[] | (string | null)[] | null | undefined;
    lore_plain?: string[] | (string | null)[] | null | undefined;
  } | null | undefined;
}): { isSet: boolean; setName: string | null } {
  const disp = item.display || {};
  
  // Chercher dans le nom
  const nameText = disp.name_text || disp.name_plain || "";
  if (nameText) {
    const setName = extractSetNameFromText(nameText);
    if (setName) {
      return { isSet: true, setName };
    }
  }
  
  // Chercher dans le lore
  const lore = disp.lore_text || disp.lore_plain || [];
  if (Array.isArray(lore)) {
    for (const line of lore) {
      if (!line || typeof line !== "string") continue;
      const setName = extractSetNameFromText(line);
      if (setName) {
        return { isSet: true, setName };
      }
    }
  }
  
  // Vérifier si "set" est mentionné (même sans nom précis)
  const allText = [
    nameText,
    ...(Array.isArray(lore) ? lore.filter((l): l is string => typeof l === "string") : []),
  ]
    .join(" ")
    .toLowerCase();
  
  const hasSetKeyword = /\bset\b/i.test(allText);
  
  return {
    isSet: hasSetKeyword,
    setName: hasSetKeyword ? "Set" : null,
  };
}
