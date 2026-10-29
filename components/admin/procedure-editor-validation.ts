import type { ProcedureAudience, ProcedureBlock } from "@/lib/types";
import type { WizardStepId } from "./procedure-editor-model";
import { isBlockEmpty } from "@/lib/procedure-draft";

export interface ValidationErrorResult {
  message: string;
  target: string | HTMLElement | null;
  step: WizardStepId;
  field?: "title" | "purpose" | "stations";
  blockId?: string;
}

interface ProcedureValidationInput {
  scope: "details" | "access" | "all";
  status: "draft" | "published";
  title: { en: string; es: string };
  purpose: { en: string; es: string };
  blocks: ProcedureBlock[];
  audience: ProcedureAudience;
  isEs: boolean;
  titleRequiredMessage: string;
  purposeRequiredMessage: string;
  stationsSection: HTMLElement | null;
}

export function validateProcedureForm({
  scope,
  status,
  title,
  purpose,
  blocks,
  audience,
  isEs,
  titleRequiredMessage,
  purposeRequiredMessage,
  stationsSection,
}: ProcedureValidationInput): ValidationErrorResult | null {
  // 1. Details validation (Title, Purpose, Content Blocks)
  if (scope === "details" || scope === "all") {
    const titleEn = title.en.trim();
    const titleEs = title.es.trim();
    if (!titleEn && !titleEs) {
      return {
        message: titleRequiredMessage || "Please enter a procedure title.",
        target: "field-title",
        step: "details",
        field: "title",
      };
    }
    if (titleEn.length > 200 || titleEs.length > 200) {
      return {
        message: "Procedure title must not exceed 200 characters.",
        target: "field-title",
        step: "details",
        field: "title",
      };
    }
    const purposeEn = purpose.en.trim();
    const purposeEs = purpose.es.trim();
    if (!purposeEn && !purposeEs) {
      return {
        message: purposeRequiredMessage,
        target: "field-purpose",
        step: "details",
        field: "purpose",
      };
    }

    // Empty text blocks and empty drafts do NOT error.
    // Only when publishing, verify that there is at least one block with actual content.
    if (status === "published") {
      const hasAnyContent = blocks.some((b) => !isBlockEmpty(b));
      if (!hasAnyContent) {
        return {
          message:
            "Please add content to at least one block before publishing.",
          target: blocks.length > 0 ? `block-${blocks[0].id}` : "proc-content",
          step: "details",
          blockId: blocks[0]?.id,
        };
      }
    }

    // Check blocks
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];

      // An empty text block NEVER gives an error
      if (b.kind === "text") {
        continue;
      }

      // An empty heading block is dropped on save, no error
      if (b.kind === "heading") {
        continue;
      }

      if (b.kind === "table") {
        if (!b.headers || b.headers.length === 0) {
          return {
            message: "Table must contain at least one column header.",
            target: `block-${b.id}`,
            step: "details",
            blockId: b.id,
          };
        }
        const emptyHeaderIdx = b.headers.findIndex(
          (h) => !h?.en?.trim() && !h?.es?.trim(),
        );
        if (emptyHeaderIdx !== -1) {
          return {
            message: `Please enter a name for Table column ${emptyHeaderIdx + 1}.`,
            target: `block-${b.id}`,
            step: "details",
            blockId: b.id,
          };
        }
      }

      if (b.kind === "recipe") {
        const hasIngredients = b.ingredients?.some((ing) => ing.name?.trim());
        const hasStepText = b.steps?.some(
          (s) => s.body?.en?.trim() || s.body?.es?.trim(),
        );
        if (hasIngredients && !hasStepText) {
          return {
            message: "Recipe must include at least one instruction step.",
            target: `block-${b.id}`,
            step: "details",
            blockId: b.id,
          };
        }
        const namelessIng = b.ingredients?.some(
          (ing) =>
            !ing.name?.trim() &&
            (ing.amounts?.some((a) => a?.trim()) || ing.unit?.trim()),
        );
        if (namelessIng) {
          return {
            message: "Please enter a name for all recipe ingredients.",
            target: `block-${b.id}`,
            step: "details",
            blockId: b.id,
          };
        }
      }

      if (b.kind === "method") {
        if (b.steps?.length > 1) {
          const emptyStepIdx = b.steps.findIndex(
            (s) =>
              !s.body?.en?.trim() &&
              !s.body?.es?.trim() &&
              !s.imageSrc &&
              !s.videoSrc,
          );
          if (emptyStepIdx !== -1) {
            return {
              message: `Please enter instructions for step ${emptyStepIdx + 1}.`,
              target: `block-${b.id}`,
              step: "details",
              blockId: b.id,
            };
          }
        }
      }

      if (b.kind === "warning") {
        if (
          status === "published" &&
          !b.body?.en?.trim() &&
          !b.body?.es?.trim()
        ) {
          return {
            message: "Warning/Callout block text cannot be empty.",
            target: `block-${b.id}`,
            step: "details",
            blockId: b.id,
          };
        }
      }

      if (b.kind === "attachment") {
        const hasTitle = b.title?.en?.trim() || b.title?.es?.trim();
        if (hasTitle && !b.href?.trim()) {
          return {
            message: "Attachment block requires a file link or URL.",
            target: `block-${b.id}`,
            step: "details",
            blockId: b.id,
          };
        }
      }

      if (b.kind === "video") {
        if (
          !b.src?.trim() &&
          (b.caption?.en?.trim() || b.caption?.es?.trim())
        ) {
          return {
            message: "Video block requires a video URL.",
            target: `block-${b.id}`,
            step: "details",
            blockId: b.id,
          };
        }
      }
    }
  }

  // 2. Access validation on publish — every procedure needs at least
  // one station assigned before going live.
  if ((scope === "access" || scope === "all") && status === "published") {
    if (audience.stationIds.length === 0) {
      return {
        message: isEs
          ? "Por favor, selecciona al menos una estación antes de publicar."
          : "Please select at least one station before publishing.",
        target: stationsSection || "proc-stations",
        step: "access",
        field: "stations",
      };
    }
  }

  return null;
}
