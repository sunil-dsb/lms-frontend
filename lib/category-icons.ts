import type { Category, Procedure, Subcategory } from "./types";
import {
  PiArrowsHorizontal,
  PiArrowsLeftRight,
  PiBookOpenText,
  PiBookOpenUser,
  PiBowlFood,
  PiBroom,
  PiChatCircleDots,
  PiChatsCircle,
  PiChatCircle,
  PiCircleHalf,
  PiCircle,
  PiClipboardText,
  PiCookingPot,
  PiDoorOpen,
  PiDrop,
  PiFileText,
  PiFire,
  PiFlame,
  PiFlask,
  PiFolder,
  PiForkKnife,
  PiHandSoap,
  PiHardHat,
  PiLeaf,
  PiLayout,
  PiLightning,
  PiListChecks,
  PiMoonStars,
  PiMoon,
  PiPackage,
  PiPlayCircle,
  PiRuler,
  PiScales,
  PiShieldCheck,
  PiSnowflake,
  PiSparkle,
  PiSunHorizon,
  PiSun,
  PiSquaresFour,
  PiTagChevron,
  PiTag,
  PiThermometer,
  PiToolbox,
  PiTrashSimple,
  PiTrash,
  PiTShirt,
  PiUserCheck,
  PiUserCirclePlus,
  PiUserPlus,
  PiUsers,
  PiWarningOctagon,
  PiWarning,
  PiHandPalm,
  PiHeartStraight,
  PiCoatHanger,
  PiSealCheck,
  PiCalendarCheck,
  PiMapTrifold,
  PiWaves,
  PiThermometerHot,
  PiSprayBottle,
  PiImage,
  PiGear,
  PiChecks,
  PiLock,
  PiTestTube,
  PiKey,
  PiHandHeart,
} from "react-icons/pi";
import type { IconType } from "react-icons";

const CATEGORY_MAP: Readonly<Record<string, IconType>> = {
  onboarding: PiUserCirclePlus,
  "food-safety": PiShieldCheck,
  "kitchen-operations": PiCookingPot,
  cleaning: PiSparkle,
  "opening-closing": PiDoorOpen,
  equipment: PiToolbox,
  recipes: PiBookOpenText,
  delivery: PiPackage,
  staff: PiUsers,
  training: PiBookOpenUser,
  temperature: PiThermometer,
  "cold-storage": PiSnowflake,
  "hot-line": PiFlame,
  prep: PiForkKnife,
  service: PiUserPlus,
  communication: PiChatCircle,
  checklist: PiListChecks,
  quick: PiLightning,
};

const SUBCATEGORY_MAP: Readonly<Record<string, IconType>> = {
  culture: PiBookOpenUser,
  uniform: PiTShirt,
  conduct: PiUserCheck,
  hygiene: PiHandSoap,
  "cross-contamination": PiArrowsHorizontal,
  "labeling-dating": PiTag,
  allergy: PiWarningOctagon,
  "station-setup": PiLayout,
  "kitchen-communication": PiChatsCircle,
  dishwashing: PiBowlFood,
  "chemical-handling": PiFlask,
  "waste-disposal": PiTrashSimple,
  "opening-procedures": PiSun,
  "closing-procedures": PiMoon,
  "end-of-day-checks": PiListChecks,
  operation: PiPlayCircle,
  "equipment-safety": PiHardHat,
  "equipment-cleaning": PiBroom,
  plating: PiCircle,
  cooking: PiFire,
  "portion-standards": PiScales,
};

const SUBCATEGORY_FALLBACK = PiFolder;

const PROCEDURE_ICON_MAP: Readonly<Record<string, IconType>> = {
  culture: PiHeartStraight,
  uniform: PiCoatHanger,
  conduct: PiSealCheck,
  hygiene: PiHandHeart, // replaces the soap dispenser
  "cross-contamination": PiArrowsLeftRight,
  "labeling-dating": PiCalendarCheck,
  allergy: PiWarning,
  "station-setup": PiMapTrifold,
  "kitchen-communication": PiChatCircleDots,
  dishwashing: PiWaves,
  "chemical-handling": PiTestTube,
  "waste-disposal": PiTrash,
  "opening-procedures": PiKey,
  "closing-procedures": PiLock,
  "end-of-day-checks": PiChecks,
  operation: PiGear,
  "equipment-safety": PiWarningOctagon,
  "equipment-cleaning": PiSprayBottle,
  plating: PiImage,
  cooking: PiThermometerHot,
  "portion-standards": PiRuler,
};

const PROCEDURE_FALLBACK = PiFileText;

export function getCategoryIcon(
  category: Pick<Category, "slug"> & { icon?: string },
): IconType {
  if (category.icon && CATEGORY_MAP[category.icon]) {
    return CATEGORY_MAP[category.icon];
  }
  return CATEGORY_MAP[category.slug] ?? PiFolder;
}

export function getSubcategoryIcon(
  sub: Pick<Subcategory, "slug"> & { icon?: string; subcategoryIcon?: string },
): IconType {
  if (sub.subcategoryIcon && CATEGORY_MAP[sub.subcategoryIcon]) {
    return CATEGORY_MAP[sub.subcategoryIcon];
  }
  if (sub.icon && CATEGORY_MAP[sub.icon]) {
    return CATEGORY_MAP[sub.icon];
  }
  return SUBCATEGORY_MAP[sub.slug] ?? SUBCATEGORY_FALLBACK;
}

export function getProcedureIcon(
  procedure: Pick<Procedure, "iconImageUrl" | "subcategoryId">,
  subcategory?: Pick<Subcategory, "slug"> | null,
): IconType {
  if (procedure.iconImageUrl) return PiFileText;
  if (subcategory?.slug && PROCEDURE_ICON_MAP[subcategory.slug]) {
    return PROCEDURE_ICON_MAP[subcategory.slug];
  }
  return PROCEDURE_FALLBACK;
}

/** Same glyph `getProcedureIcon` would return when no image is uploaded.
 *  Exposed standalone so wizard surfaces that don't have a Procedure row yet
 *  (new-procedure step before save) can still show the right per-subcategory
 *  glyph. Slug must match PROCEDURE_ICON_MAP; otherwise PiFileText. */
export function getProcedureGlyphForSubcategory(
  slug: string | null | undefined,
): IconType {
  if (slug && PROCEDURE_ICON_MAP[slug]) return PROCEDURE_ICON_MAP[slug];
  return PiFileText;
}

export const StationsTileIcon = PiSquaresFour;
