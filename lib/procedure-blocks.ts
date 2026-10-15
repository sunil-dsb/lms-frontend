import type {
  Localised,
  LocalisedOptional,
  ProcedureBlock,
  ProcedureBlockKind,
  ProcedureIngredient,
  ProcedureMethodStep,
  ProcedureYieldItem,
} from './types';

/** Cheap, monotonically increasing id. Doesn't need to be crypto-grade — these
 *  blocks are scoped to one in-memory composer session. */
let blockCounter = 0;
export function nextBlockId(): string {
  blockCounter += 1;
  return `b-${Date.now().toString(36)}-${blockCounter.toString(36)}`;
}

const empty = (): Localised => ({ en: '', es: '' });
const emptyOpt = (): LocalisedOptional => ({ en: '', es: '' });

export const nextStepId = (): string => `s-${Math.random().toString(36).slice(2, 8)}`;

const newStep = (): ProcedureMethodStep => ({
  id: nextStepId(),
  body: empty(),
  critical: false,
});

export function newTextBlock(): ProcedureBlock {
  return { id: nextBlockId(), kind: 'text', body: empty() };
}

export function newHeadingBlock(): ProcedureBlock {
  return { id: nextBlockId(), kind: 'heading', level: 2, text: empty() };
}

export function newMethodBlock(): ProcedureBlock {
  return { id: nextBlockId(), kind: 'method', title: empty(), steps: [newStep()] };
}

const DEFAULT_FACTORS = [1, 2, 4];

export const DEFAULT_YIELD_TEMPLATE: ProcedureYieldItem[] = [
  { label: 'Total Batch Weight', value: '', unit: 'kg', scales: true },
  { label: 'Portion Count', value: '', unit: 'tacos', scales: true },
  { label: 'Portion Size', value: '', unit: 'g', scales: false },
  { label: 'Total Cooking Time', value: '', unit: 'hrs', scales: false },
];

const emptyYield = (): ProcedureYieldItem => ({ label: '', value: '', unit: '' });

const emptyIngredient = (factorCount: number): ProcedureIngredient => ({
  name: '',
  form: '',
  allergen: false,
  amounts: Array.from({ length: factorCount }, () => ''),
});

export function newIngredientsBlock(): ProcedureBlock {
  return {
    id: nextBlockId(),
    kind: 'ingredients',
    audience: '',
    yieldItems: DEFAULT_YIELD_TEMPLATE.map((y) => ({ ...y })),
    factors: [...DEFAULT_FACTORS],
    ingredients: [emptyIngredient(DEFAULT_FACTORS.length)],
  };
}

export function newRecipeBlock(): ProcedureBlock {
  return {
    id: nextBlockId(),
    kind: 'recipe',
    audience: '',
    yieldItems: DEFAULT_YIELD_TEMPLATE.map((y) => ({ ...y })),
    factors: [...DEFAULT_FACTORS],
    ingredients: [],
    steps: [newStep()],
  };
}

export function newImageBlock(): ProcedureBlock {
  return {
    id: nextBlockId(),
    kind: 'image',
    src: '',
    alt: empty(),
    caption: emptyOpt(),
    hint: 'photo',
  };
}

export function newVideoBlock(): ProcedureBlock {
  return { id: nextBlockId(), kind: 'video', src: '', caption: emptyOpt() };
}

export function newWarningBlock(): ProcedureBlock {
  return { id: nextBlockId(), kind: 'warning', severity: 'warn', body: empty() };
}

export function newAttachmentBlock(): ProcedureBlock {
  return { id: nextBlockId(), kind: 'attachment', title: empty(), href: '', meta: '' };
}

export function newTableBlock(): ProcedureBlock {
  const header: Localised = empty();
  return {
    id: nextBlockId(),
    kind: 'table',
    headers: [header, { ...header }],
    rows: [
      [{ en: '', es: '' }, { en: '', es: '' }],
      [{ en: '', es: '' }, { en: '', es: '' }],
    ],
  };
}

const nextChecklistItemId = (): string => `ci-${Math.random().toString(36).slice(2, 8)}`;

const emptyChecklistItem = (): { id: string; text: Localised } => ({
  id: nextChecklistItemId(),
  text: empty(),
});

export function newChecklistBlock(): ProcedureBlock {
  return {
    id: nextBlockId(),
    kind: 'checklist',
    title: emptyOpt(),
    items: [emptyChecklistItem(), emptyChecklistItem(), emptyChecklistItem()],
  };
}

export const BLOCK_FACTORIES: Record<ProcedureBlockKind, () => ProcedureBlock> = {
  text: newTextBlock,
  heading: newHeadingBlock,
  method: newMethodBlock,
  ingredients: newIngredientsBlock,
  recipe: newRecipeBlock,
  image: newImageBlock,
  video: newVideoBlock,
  warning: newWarningBlock,
  attachment: newAttachmentBlock,
  table: newTableBlock,
  checklist: newChecklistBlock,
};

export const BLOCK_KIND_LABELS: ProcedureBlockKind[] = [
  'text',
  'heading',
  'method',
  'ingredients',
  'recipe',
  'image',
  'video',
  'warning',
  'attachment',
  'table',
  'checklist',
];

/** Resize every ingredient's amounts row so its length matches the current
 *  factor count. New cells get empty strings; over-long rows get trimmed.
 *  Pure: returns a new array, doesn't mutate the input. */
export function syncAmountsWithFactors(
  ingredients: ProcedureIngredient[],
  factors: number[],
): ProcedureIngredient[] {
  const n = factors.length;
  return ingredients.map((row) => ({
    ...row,
    amounts:
      row.amounts.length === n
        ? row.amounts
        : n > row.amounts.length
          ? [...row.amounts, ...Array.from({ length: n - row.amounts.length }, () => '')]
          : row.amounts.slice(0, n),
  }));
}

function cloneLocalised(v: Localised): Localised;
function cloneLocalised(v: LocalisedOptional): LocalisedOptional;
function cloneLocalised(v: Localised | LocalisedOptional): Localised | LocalisedOptional {
  return { en: v.en, es: v.es };
}

function cloneRequiredLocalised(v: Localised): Localised {
  return { en: v.en, es: v.es };
}

function cloneStep(step: ProcedureMethodStep): ProcedureMethodStep {
  return {
    ...step,
    id: nextStepId(),
    body: cloneLocalised(step.body),
    criticalLimit: step.criticalLimit ? { ...step.criticalLimit } : undefined,
    videoSegment: step.videoSegment ? { ...step.videoSegment } : undefined,
    // The `images` array is shared by reference when spread — deep-clone so
    // deleting an image from the clone doesn't take it out of the original.
    images: step.images
      ? step.images.map((img) => ({ src: img.src, alt: cloneRequiredLocalised(img.alt) }))
      : undefined,
  };
}

/** Deep-clone a block with a fresh id. Used by the per-block Duplicate action;
 *  the caller is responsible for splicing the result into the parent list. */
export function duplicateBlock(block: ProcedureBlock): ProcedureBlock {
  const id = nextBlockId();
  switch (block.kind) {
    case 'text':
      return { id, kind: 'text', body: cloneLocalised(block.body) };
    case 'heading':
      return { id, kind: 'heading', level: block.level, text: cloneLocalised(block.text) };
    case 'method':
      return { id, kind: 'method', title: block.title ? { ...block.title } : undefined, steps: block.steps.map(cloneStep) };
    case 'ingredients':
      return {
        id,
        kind: 'ingredients',
        audience: block.audience,
        allergen: block.allergen ? { ...block.allergen } : undefined,
        yieldItems: block.yieldItems?.map((y) => ({ ...y })),
        factors: block.factors?.slice(),
        ingredients: block.ingredients?.map((i) => ({ ...i, amounts: i.amounts.slice() })),
      };
    case 'recipe':
      return {
        id,
        kind: 'recipe',
        audience: block.audience,
        allergen: block.allergen ? { ...block.allergen } : undefined,
        yieldItems: block.yieldItems?.map((y) => ({ ...y })),
        factors: block.factors?.slice(),
        ingredients: block.ingredients?.map((i) => ({ ...i, amounts: i.amounts.slice() })),
        steps: block.steps.map(cloneStep),
      };
    case 'image':
      return {
        id,
        kind: 'image',
        src: block.src,
        alt: cloneLocalised(block.alt),
        caption: block.caption ? cloneLocalised(block.caption) : undefined,
        hint: block.hint,
      };
    case 'video':
      return {
        id,
        kind: 'video',
        src: block.src,
        caption: block.caption ? cloneLocalised(block.caption) : undefined,
      };
    case 'warning':
      return {
        id,
        kind: 'warning',
        severity: block.severity,
        body: cloneLocalised(block.body),
      };
    case 'attachment':
      return {
        id,
        kind: 'attachment',
        title: cloneLocalised(block.title),
        href: block.href,
        meta: block.meta,
      };
    case 'table':
      return {
        id,
        kind: 'table',
        headers: block.headers.map(cloneRequiredLocalised),
        rows: block.rows.map((row) => row.map(cloneRequiredLocalised)),
      };
    case 'checklist':
      return {
        id,
        kind: 'checklist',
        title: block.title ? cloneLocalised(block.title) : undefined,
        items: block.items.map((it) => ({ id: nextChecklistItemId(), text: cloneLocalised(it.text) })),
      };
  }
}
