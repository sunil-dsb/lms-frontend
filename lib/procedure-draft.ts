import type {
  Localised,
  LocalisedOptional,
  Procedure,
  ProcedureBlock,
  ProcedureBody,
  ProcedureIngredient,
  ProcedureYieldItem,
} from "./types";
import type { RecipeIngredientItem } from "@/components/admin/recipe-ingredients-editor";

/**
 * Turning what the procedure editor holds into a procedure body, and back.
 *
 * The editor keeps the content as a list of blocks, and for a recipe, the
 * ingredients and yield beside it. Saving folds them into one body; opening a
 * saved procedure to edit unfolds them again.
 */

/** The batch sizes a recipe offers the cook. */
export const RECIPE_BATCH_FACTORS = [1, 2, 4] as const;

/** The four yield fields, in the order the panel and the reader show them. */
export const YIELD_FIELD_LABELS = [
  "Total yield",
  "Portions",
  "Portion size",
  "Total time",
] as const;

export function emptyYieldItems(): ProcedureYieldItem[] {
  return YIELD_FIELD_LABELS.map((label) => ({ label, value: "", unit: "" }));
}

export function emptyIngredient(): RecipeIngredientItem {
  return { id: newId("ing"), name: "", quantity: "", unit: "kg", notes: "" };
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ------------------------------------------------------------ emptiness -- */

const locEmpty = (l: { en?: string; es?: string } | undefined): boolean =>
  (l?.en ?? "").trim() === "" && (l?.es ?? "").trim() === "";

/** A block the manager added and never filled in. Dropped on save. */
export function isBlockEmpty(block: ProcedureBlock): boolean {
  switch (block.kind) {
    case "text":
      return locEmpty(block.body);
    case "heading":
      return locEmpty(block.text);
    case "warning":
      return locEmpty(block.body);
    case "image":
      return (
        block.src.trim() === "" &&
        locEmpty(block.alt) &&
        locEmpty(block.caption)
      );
    case "video":
      return block.src.trim() === "" && locEmpty(block.caption);
    case "attachment":
      return locEmpty(block.title) && block.href.trim() === "";
    case "method":
      return (
        block.steps.length === 0 ||
        block.steps.every(
          (s) =>
            locEmpty(s.body) &&
            (!s.images || s.images.length === 0) &&
            !s.imageSrc &&
            !s.videoSrc &&
            !s.timer &&
            !s.note,
        )
      );
    case "recipe":
      return (
        block.steps.every(
          (s) =>
            locEmpty(s.body) &&
            (!s.images || s.images.length === 0) &&
            !s.imageSrc &&
            !s.videoSrc &&
            !s.timer &&
            !s.note,
        ) && (block.ingredients ?? []).every((i) => i.name.trim() === "")
      );
    case "table":
      return (
        block.headers.every((h) => locEmpty(h)) &&
        block.rows.every((r) => r.every((c) => locEmpty(c)))
      );
    case "checklist":
      return (
        locEmpty(block.title) && block.items.every((it) => locEmpty(it.text))
      );
    default:
      return false;
  }
}

/* ------------------------------------------------------------- backfill -- */

/** Fill a missing language from the other, so a draft written in one language
 *  still saves. Optional fields are only filled when one side has content. */
function backfill<T extends Localised | LocalisedOptional | undefined>(
  l: T,
): T {
  if (!l) return l;
  const en = (l.en ?? "").trim();
  const es = (l.es ?? "").trim();
  if (en === "" && es === "") return l;
  return { ...l, en: en || es, es: es || en } as T;
}

function backfillBlock(block: ProcedureBlock): ProcedureBlock {
  switch (block.kind) {
    case "text":
      return { ...block, body: backfill(block.body) as Localised };
    case "heading":
      return { ...block, text: backfill(block.text) as Localised };
    case "warning":
      return { ...block, body: backfill(block.body) as Localised };
    case "image": {
      const en = (block.alt?.en ?? "").trim();
      const es = (block.alt?.es ?? "").trim();
      return {
        ...block,
        alt: {
          en: en || es || "Procedure image",
          es: es || en || "Imagen del procedimiento",
        },
        caption: backfill(block.caption) as LocalisedOptional,
      };
    }
    case "video":
      return {
        ...block,
        caption: backfill(block.caption) as LocalisedOptional,
      };
    case "attachment":
      return { ...block, title: backfill(block.title) as Localised };
    case "method":
    case "recipe":
      return {
        ...block,
        steps: block.steps.map((s) => ({
          ...s,
          body: backfill(s.body) as Localised,
          ...(s.note
            ? { note: { ...s.note, body: backfill(s.note.body) as Localised } }
            : {}),
          ...(s.images
            ? {
                images: s.images.map((img) => ({
                  ...img,
                  alt: backfill(img.alt) as Localised,
                })),
              }
            : {}),
        })),
      } as ProcedureBlock;
    case "table":
      return {
        ...block,
        headers: block.headers.map((h) => backfill(h) as Localised),
        rows: block.rows.map((row) => row.map((c) => backfill(c) as Localised)),
      };
    case "checklist":
      return {
        ...block,
        title: backfill(block.title) as LocalisedOptional,
        items: block.items.map((it) => ({
          ...it,
          text: backfill(it.text) as Localised,
        })),
      };
    default:
      return block;
  }
}

/* ----------------------------------------------------------------- save -- */

function toIngredient(item: RecipeIngredientItem): ProcedureIngredient | null {
  const name = item.name.trim();
  if (!name) return null;
  const raw = item.quantity.trim() || "1";
  const num = parseFloat(raw);
  const amounts =
    !isNaN(num) && num > 0
      ? [String(num), String(num * 2), String(num * 4)]
      : [raw, raw, raw];
  return {
    name,
    allergen: false,
    unit: item.unit?.trim() || undefined,
    amounts,
  };
}

/**
 * The editor's state as a procedure body.
 *
 * A recipe gets one recipe block carrying its ingredients and yield. Its
 * method is the first "Steps" block the manager wrote: the recipe takes that
 * block's place, so the method reads where it was written. Without one, the
 * recipe goes first and carries a single step naming the dish, as it always did.
 */
export function buildBody(args: {
  blocks: ProcedureBlock[];
  recipe: null | {
    ingredients: RecipeIngredientItem[];
    yieldItems: ProcedureYieldItem[];
    title: Localised;
  };
}): ProcedureBody {
  const rest = args.blocks.filter((b) => !isBlockEmpty(b));

  // The recipe panel only carries real content when this procedure was
  // opened from a saved recipe (`toEditorContent` unfolds its ingredients
  // and yield rows into the panel). For a new procedure the panel is empty
  // — the wizard has no UI to fill it. Folding an empty panel into a block
  // would invent a recipe out of a checklist or a numbered list purely
  // because the category is called "Recipes", and the reader would then
  // render a Yield section (batch pills scaling nothing) for content that
  // never asked for one. An empty panel leaves the manager's blocks exactly
  // as they wrote them.
  const hasRecipeContent =
    args.recipe !== null &&
    (args.recipe.ingredients.some((i) => i.name.trim() !== "") ||
      args.recipe.yieldItems.some(
        (y) => y.label.trim() !== "" && y.value.trim() !== "",
      ));

  if (hasRecipeContent && args.recipe) {
    const methodIndex = rest.findIndex((b) => b.kind === "method");
    const method = methodIndex >= 0 ? rest[methodIndex] : null;
    const steps =
      method && method.kind === "method"
        ? method.steps
        : [
            {
              id: newId("s"),
              body: {
                en: args.recipe.title.en || args.recipe.title.es || "Recipe",
                es: args.recipe.title.es || args.recipe.title.en || "Receta",
              },
            },
          ];
    const yieldItems = args.recipe.yieldItems
      .filter((y) => y.label.trim() && y.value.trim())
      .map((y) => ({
        label: y.label.trim(),
        value: y.value.trim(),
        ...(y.unit?.trim() ? { unit: y.unit.trim() } : {}),
      }));
    const validIngredients = args.recipe.ingredients
      .map(toIngredient)
      .filter((i): i is ProcedureIngredient => i !== null);
    const recipe: ProcedureBlock = {
      id: newId("r"),
      kind: "recipe",
      audience: "",
      ...(validIngredients.length > 0
        ? { factors: [...RECIPE_BATCH_FACTORS], ingredients: validIngredients }
        : {}),
      ...(yieldItems.length ? { yieldItems } : {}),
      steps,
    };
    const ordered = method
      ? rest.map((b, i) => (i === methodIndex ? recipe : b))
      : [recipe, ...rest];
    return { blocks: ordered.map(backfillBlock) };
  }

  if (rest.length > 0) return { blocks: rest.map(backfillBlock) };
  // The body needs one block; a draft saved before anything was written gets a heading.
  return {
    blocks: [
      {
        id: newId("h"),
        kind: "heading",
        level: 2,
        text: { en: "Procedure", es: "Procedimiento" },
      },
    ],
  };
}

/* ----------------------------------------------------------------- open -- */

/** A saved procedure unfolded into what the editor holds. The inverse of
 *  `buildBody`: the recipe block gives back its ingredients and yield, and its
 *  steps return as a "Steps" block the manager can edit like any other. */
export function toEditorContent(p: Procedure): {
  blocks: ProcedureBlock[];
  ingredients: RecipeIngredientItem[];
  yieldItems: ProcedureYieldItem[];
} {
  const source =
    (p.bodyEn?.blocks?.length ?? 0) > 0
      ? p.bodyEn!.blocks
      : (p.bodyEs?.blocks ?? []);
  const recipe = source.find((b) => b.kind === "recipe");
  const blocks = source.flatMap((b): ProcedureBlock[] =>
    b.kind === "recipe"
      ? [{ id: newId("m"), kind: "method", steps: b.steps }]
      : [b],
  );
  if (!recipe || recipe.kind !== "recipe")
    return {
      blocks,
      ingredients: [emptyIngredient()],
      yieldItems: emptyYieldItems(),
    };

  const ingredients = (recipe.ingredients ?? []).map((i) => ({
    id: newId("ing"),
    name: i.name,
    quantity: i.amounts[0] ?? "",
    unit: i.unit ?? "kg",
    notes: "",
  }));
  const yieldItems = emptyYieldItems().map((slot) => {
    const saved = (recipe.yieldItems ?? []).find((y) => y.label === slot.label);
    return saved
      ? { ...slot, value: saved.value, unit: saved.unit ?? "" }
      : slot;
  });
  return {
    blocks,
    ingredients: ingredients.length ? ingredients : [emptyIngredient()],
    yieldItems,
  };
}

/* ----------------------------------------------------------- derivation -- */

/** A procedure a Spanish-reading cook cannot read yet. */
export function missingSpanish(
  p: Pick<Procedure, "titleEs" | "bodyEn" | "bodyEs">,
): boolean {
  return (
    !p.titleEs?.trim() ||
    ((p.bodyEn?.blocks?.length ?? 0) > 0 &&
      (p.bodyEs?.blocks?.length ?? 0) === 0)
  );
}
