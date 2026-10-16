/** FDA Big-9 allergens. Keys double as stable identifiers for the structured
 *  picker (admin editor) and the chip renderer (procedure reader). The
 *  English labels match `admin.library.new.form.allergens.*`; the Spanish
 *  labels mirror those translations for the server-rendered reader where
 *  `useTranslations` isn't available. */

export const ALLERGEN_KEYS = [
  "milk",
  "eggs",
  "fish",
  "shellfish",
  "treeNuts",
  "peanuts",
  "wheat",
  "gluten",
  "soy",
  "sesame",
  "celery",
  "mustard",
  "sulphites",
  "lupin",
  "molluscs",
  "corn",
] as const;

export type AllergenKey = (typeof ALLERGEN_KEYS)[number];

export const ALLERGEN_LABELS: Record<AllergenKey, { en: string; es: string }> =
  {
    milk: { en: "Milk", es: "Leche" },
    eggs: { en: "Eggs", es: "Huevos" },
    fish: { en: "Fish", es: "Pescado" },
    shellfish: { en: "Shellfish", es: "Mariscos" },
    treeNuts: { en: "Tree nuts", es: "Frutos secos" },
    peanuts: { en: "Peanuts", es: "Cacahuetes" },
    wheat: { en: "Wheat", es: "Trigo" },
    gluten: { en: "Gluten", es: "Gluten" },
    soy: { en: "Soy", es: "Soya" },
    sesame: { en: "Sesame", es: "Sésamo" },
    celery: { en: "Celery", es: "Apio" },
    mustard: { en: "Mustard", es: "Mostaza" },
    sulphites: { en: "Sulphites", es: "Sulfitos" },
    lupin: { en: "Lupin", es: "Altramuces" },
    molluscs: { en: "Molluscs", es: "Moluscos" },
    corn: { en: "Corn", es: "Maíz" },
  };
