import type { ProcedureNoteKind } from "@/lib/types";

export const STEP_TONE_CONFIGS: Record<
  ProcedureNoteKind,
  {
    label: string;
    icon: string;
    activeBg: string;
    activeColor: string;
    tintBg: string;
    iconColor: string;
  }
> = {
  warn: {
    label: "Warning",
    icon: "ri-alert-line",
    activeBg: "#d97706",
    activeColor: "#ffffff",
    tintBg: "var(--color-warn-tint)",
    iconColor: "#d97706",
  },
  tip: {
    label: "Tip",
    icon: "ri-lightbulb-line",
    activeBg: "#166534",
    activeColor: "#ffffff",
    tintBg: "var(--color-ok-tint)",
    iconColor: "#166534",
  },
  allergen: {
    label: "Allergen",
    icon: "ri-error-warning-line",
    activeBg: "#b91c1c",
    activeColor: "#ffffff",
    tintBg: "var(--color-bad-tint)",
    iconColor: "#b91c1c",
  },
  equip: {
    label: "Equipment",
    icon: "ri-tools-line",
    activeBg: "#2563eb",
    activeColor: "#ffffff",
    tintBg: "var(--color-wash)",
    iconColor: "#2563eb",
  },
  alt: {
    label: "Alternative",
    icon: "ri-information-line",
    activeBg: "#475569",
    activeColor: "#ffffff",
    tintBg: "var(--color-wash)",
    iconColor: "#475569",
  },
};
