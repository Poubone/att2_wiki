import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, ChevronDown } from "lucide-react";
import type { SupportedLang } from "../i18n";
import { supportedLngs } from "../i18n";

/** Code langue → code pays ISO 3166-1 alpha-2 pour flag-icons (drapeaux SVG). */
const LANG_TO_COUNTRY: Record<SupportedLang, string> = {
  fr: "fr",
  en: "gb",
  zh: "cn",
  ja: "jp",
  ko: "kr",
  ar: "sa",
  ru: "ru",
  es: "es",
  de: "de",
  hi: "in",
  pt: "pt",
};

/** Ordre et libellés natifs (alignés sur le datapack LANGUAGE=0..10). */
const LANGUAGE_OPTIONS: { value: SupportedLang; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "ar", label: "العربية" },
  { value: "ru", label: "Русский" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
  { value: "hi", label: "हिन्दी" },
  { value: "pt", label: "Português" },
];

function getCurrentLang(lng: string | undefined): SupportedLang {
  const code = (lng ?? "fr").slice(0, 2).toLowerCase();
  return supportedLngs.includes(code as SupportedLang) ? (code as SupportedLang) : "fr";
}

/** Drapeau SVG via flag-icons (toujours lisible, pas d’emoji FR/EN). */
function Flag({ lang }: { lang: SupportedLang }) {
  const country = LANG_TO_COUNTRY[lang] ?? "fr";
  return (
    <span
      className={`fi fi-${country}`}
      style={{ width: "1.5rem", height: "1rem", display: "inline-block", borderRadius: 2 }}
      aria-hidden
    />
  );
}

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = getCurrentLang(i18n.language);
  const selectedOption = LANGUAGE_OPTIONS.find((o) => o.value === current) ?? LANGUAGE_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Language"
        className="flex items-center gap-2 pl-9 pr-8 py-2 bg-input border-2 border-border text-foreground text-sm outline-none focus:border-primary cursor-pointer rounded-none min-w-[10rem] text-left"
      >
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none shrink-0" />
        <span className="flex items-center gap-2 truncate">
          <Flag lang={selectedOption.value} />
          {selectedOption.label}
        </span>
        <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 py-1 bg-input border-2 border-border z-50 max-h-64 overflow-auto shadow-lg"
        >
          {LANGUAGE_OPTIONS.map(({ value, label }) => (
            <li
              key={value}
              role="option"
              aria-selected={value === current}
              onClick={() => {
                i18n.changeLanguage(value);
                setOpen(false);
              }}
              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-secondary/70 ${value === current ? "bg-primary/20 text-primary" : "text-foreground"}`}
            >
              <Flag lang={value} />
              {label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
