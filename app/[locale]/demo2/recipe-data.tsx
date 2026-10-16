import * as React from "react";

/**
 * Guacamole Fresco as a medium-sized recipe: 23 steps in four parts, most of
 * them with a photo or a clip, which is the shape a real recipe here will have.
 *
 * Each step is said once, here. /demo2 draws its words in the method, and its
 * picture on the photo stage while it is the step being read.
 *
 * A copy of /demo3's data on purpose: the demos change separately.
 */

export const IMG = "/demo/guacamole";

export type IngredientKey =
  "avocado" | "lime" | "onion" | "cilantro" | "serrano" | "salt" | "sesame";

export const INGREDIENTS: {
  key: IngredientKey;
  name: string;
  form?: string;
  base: string;
  allergen?: boolean;
}[] = [
  {
    key: "avocado",
    name: "Avocado, Hass",
    form: "Whole fruit, about 2 kg of flesh. Ripe: gives slightly at the neck",
    base: "2.8 kg",
  },
  { key: "lime", name: "Lime juice", form: "Fresh, strained", base: "100 ml" },
  {
    key: "onion",
    name: "White onion",
    form: "Small dice, 5 mm",
    base: "200 g",
  },
  {
    key: "cilantro",
    name: "Cilantro",
    form: "Leaves and fine stem, chopped",
    base: "30 g",
  },
  {
    key: "serrano",
    name: "Serrano chilli",
    form: "Seeded, minced",
    base: "20 g",
  },
  { key: "salt", name: "Salt, kosher", base: "20 g" },
  {
    key: "sesame",
    name: "Sesame finishing oil",
    base: "15 ml",
    allergen: true,
  },
];

export const FACTORS = [1, 2, 4] as const;

/** Two decimals is finer than any kitchen scale; no trailing zeros. */
export const fmt = (n: number): string => String(Math.round(n * 100) / 100);
export function scale(amount: string, f: number): string {
  const m = /^([0-9.]+)\s*(.*)$/.exec(amount.trim());
  return m ? fmt(parseFloat(m[1]) * f) + (m[2] ? ` ${m[2]}` : "") : amount;
}

export type Pic = { src: string; alt: string };

export type Media =
  | ({ kind: "photo"; caption?: string } & Pic)
  /** A moment of the recipe's one video, from `at`, lasting `len`. */
  | ({ kind: "clip"; at: string; len: string } & Pic)
  /** Right beside wrong: the one thing a sentence cannot show. */
  | { kind: "compare"; ok: Pic; no: Pic }
  /** No photograph: a drawn sign of the action, so the stage still says something. */
  | { kind: "glyph"; glyph: "wash" | "taste" | "cold"; label: string };

export type Qty = (k: IngredientKey) => React.ReactElement;

export type RecipeStep = {
  n: number;
  text: (q: Qty) => React.ReactNode;
  /** Why, or what to look for. On the cook-mode screen, not in the overview. */
  note?: React.ReactNode;
  /** Safety, so it is in both. */
  warn?: { kind: "warn" | "allergen"; body: React.ReactNode };
  crit?: boolean;
  media?: Media;
  /** Written on the label: the discard time, worked out when it is shown. */
  discardAt?: boolean;
};

export const FULL_VIDEO = {
  src: `${IMG}/video-cover.jpg`,
  alt: "Finished guacamole in a stone molcajete, surrounded by avocados, limes, onion, cilantro and serrano chillies.",
  len: "3:40",
};

const ms = <span lang="es">molcajete</span>;

export const STEPS: RecipeStep[] = [
  /* --- Set up ------------------------------------------------------------ */
  {
    n: 1,
    text: () => "Wash your hands for 20 seconds. Put on fresh gloves.",
    media: { kind: "glyph", glyph: "wash", label: "Hands, 20 seconds" },
  },
  {
    n: 2,
    text: () => <>Sanitise the {ms}, the board and the bench.</>,
    note: "The test strip should read 200 ppm. Let it air-dry: a cloth puts back what the sanitiser took off.",
    media: {
      kind: "photo",
      src: "sanitising.jpg",
      alt: "Two red buckets on a steel bench, one labelled Wash and one labelled Sanitise, with a pot of test strips beside them.",
    },
  },
  {
    n: 3,
    text: () => (
      <>
        Put out the tools: {ms} and <span lang="es">tejolote</span>, bench
        scraper, quarter pan, scale, probe thermometer.
      </>
    ),
    media: {
      kind: "photo",
      src: "equipment.jpg",
      alt: "Everything needed laid out: four avocados, two limes, half an onion, cilantro, two serrano chillies, a molcajete and tejolote, a scale, a quarter pan and a bench scraper.",
    },
  },
  {
    n: 4,
    text: () => "Weigh out every ingredient for the batch.",
    note: "Each step says its amount too, at the batch you chose.",
    media: {
      kind: "clip",
      at: "0:02",
      len: "0:10",
      src: "crop-scale.jpg",
      alt: "A digital kitchen scale on the bench.",
    },
  },

  /* --- Prep the ingredients ---------------------------------------------- */
  {
    n: 5,
    text: (q) => <>Dice the onion ({q("onion")}) to 5 mm.</>,
    note: "Bigger than this and it reads as raw onion, not seasoning.",
    media: {
      kind: "photo",
      src: "step-5-dice.jpg",
      alt: "Finely diced white onion beside a steel ruler, one cube against the scale showing five millimetres.",
      caption: "Onion at 5 mm.",
    },
  },
  {
    n: 6,
    text: (q) => (
      <>Chop the cilantro ({q("cilantro")}): the leaves and the fine stem.</>
    ),
    note: "Leave the thick stem out. It stays stringy.",
    media: {
      kind: "clip",
      at: "0:14",
      len: "0:08",
      src: "crop-cilantro.jpg",
      alt: "A bunch of fresh cilantro on the bench.",
    },
  },
  {
    n: 7,
    text: (q) => <>Seed and mince the serrano ({q("serrano")}).</>,
    note: "Wash the board and change gloves after. Chilli oil carries to everything you touch next.",
    media: {
      kind: "clip",
      at: "0:24",
      len: "0:12",
      src: "crop-chilli.jpg",
      alt: "Two green serrano chillies on the bench.",
    },
  },
  {
    n: 8,
    text: (q) => <>Juice the limes and strain the juice: {q("lime")}.</>,
    note: "Strained, so no seed ends up in a portion.",
    media: {
      kind: "clip",
      at: "0:38",
      len: "0:08",
      src: "crop-limes.jpg",
      alt: "Two whole limes and a cut half.",
    },
  },
  {
    n: 9,
    text: (q) => (
      <>
        Check each avocado ({q("avocado")} in all). Ripe gives slightly at the
        neck.
      </>
    ),
    note: "Set aside any with brown flesh or a sour smell. One bad avocado turns the whole batch.",
    media: {
      kind: "photo",
      src: "crop-avocados.jpg",
      alt: "Four whole Hass avocados, dark and pebbled.",
    },
  },

  /* --- Make -------------------------------------------------------------- */
  {
    n: 10,
    text: () =>
      "Cut each avocado lengthwise, all the way round the stone. Twist the halves apart.",
    media: {
      kind: "clip",
      at: "0:50",
      len: "0:08",
      src: "crop-cut.jpg",
      alt: "An avocado cut in half, the stone in one half.",
    },
  },
  {
    n: 11,
    text: () =>
      "Strike the stone with the heel of the knife, then twist to lift it out.",
    warn: {
      kind: "warn",
      body: "Strike once. A second strike at a stone that is already loose is how the blade slips into your hand.",
    },
    media: {
      kind: "photo",
      src: "step-1-stone.jpg",
      alt: "A chef's knife against the stone of a halved avocado, one hand steadying the fruit, ready to strike.",
    },
  },
  {
    n: 12,
    text: () => <>Scoop the flesh into the {ms}. Scrape the skin clean.</>,
    note: "The flesh nearest the skin is the greenest.",
    media: {
      kind: "clip",
      at: "1:08",
      len: "0:10",
      src: "crop-molcajete.jpg",
      alt: "A hand steadying a stone molcajete with its tejolote.",
    },
  },
  {
    n: 13,
    text: () =>
      "Mash to a coarse texture. Stop while pieces are still visible.",
    media: {
      kind: "compare",
      ok: {
        src: "step-3-correct.jpg",
        alt: "Avocado mashed coarsely, with distinct pieces still visible.",
      },
      no: {
        src: "step-3-overmashed.jpg",
        alt: "Avocado mashed to a smooth purée with no pieces left.",
      },
    },
  },
  {
    n: 14,
    text: (q) => (
      <>Fold in all of the lime juice ({q("lime")}) straight away.</>
    ),
    note: "Without it, the avocado browns within minutes.",
    media: {
      kind: "clip",
      at: "1:34",
      len: "0:06",
      src: "crop-limes.jpg",
      alt: "Two whole limes and a cut half.",
    },
  },
  {
    n: 15,
    text: (q) => (
      <>
        Fold in the onion ({q("onion")}), cilantro ({q("cilantro")}) and serrano
        ({q("serrano")}).
      </>
    ),
    media: {
      kind: "clip",
      at: "1:42",
      len: "0:10",
      src: "crop-bowl.jpg",
      alt: "Guacamole in a molcajete, flecked with onion and cilantro.",
    },
  },
  {
    n: 16,
    text: (q) => <>Add the salt ({q("salt")}). Taste with a clean spoon.</>,
    note: "A fresh spoon every time you taste again.",
    media: { kind: "glyph", glyph: "taste", label: "A clean spoon each taste" },
  },
  {
    n: 17,
    text: (q) => (
      <>
        Add the sesame oil ({q("sesame")}). Fold once, so it streaks rather than
        blends.
      </>
    ),
    warn: {
      kind: "allergen",
      body: "Sesame enters here. Anything for an allergy ticket is made without it, in a clean molcajete.",
    },
    media: {
      kind: "clip",
      at: "2:02",
      len: "0:06",
      src: "crop-bowl.jpg",
      alt: "Guacamole in a molcajete, flecked with onion and cilantro.",
    },
  },
  {
    n: 18,
    text: () =>
      "Check the texture: coarse, bright green, pieces still visible.",
    media: {
      kind: "photo",
      src: "step-3-correct.jpg",
      alt: "Avocado mashed coarsely, with distinct pieces still visible.",
      caption: "This is right.",
    },
  },

  /* --- Store and check --------------------------------------------------- */
  {
    n: 19,
    text: () =>
      "Transfer to a quarter pan. Press film onto the surface so no air touches it.",
    note: "Any trapped air browns it. The 30 minutes to the walk-in start now.",
    media: {
      kind: "photo",
      src: "step-8-film.jpg",
      alt: "Both hands pressing cling film flat onto guacamole in a quarter pan, no air trapped under it.",
    },
  },
  {
    n: 20,
    text: () => (
      <>
        Label the pan: today&apos;s date, the time, and the discard time,{" "}
        <b>48 hours later</b>.
      </>
    ),
    note: "Colour is not the test. The label is.",
    discardAt: true,
    media: {
      kind: "photo",
      src: "crop-label.jpg",
      alt: "A label on the pan reading Guacamole, with the prep date and time.",
    },
  },
  {
    n: 21,
    text: () => "Into the walk-in within 30 minutes of finishing.",
    note: "Top shelf, above anything raw.",
    media: { kind: "glyph", glyph: "cold", label: "Walk-in within 30 minutes" },
  },
  {
    n: 22,
    crit: true,
    text: () =>
      "Before service, probe the centre of the pan and record the reading.",
    media: {
      kind: "photo",
      src: "step-8-label.jpg",
      alt: "A labelled pan of guacamole with a probe thermometer in the centre reading 4.0 °C.",
      caption: "Probed at the centre: 4.0 °C.",
    },
  },
  {
    n: 23,
    text: () => <>Wash, rinse and sanitise the {ms} and the board.</>,
    media: {
      kind: "photo",
      src: "sanitising.jpg",
      alt: "Two red buckets on a steel bench, one labelled Wash and one labelled Sanitise.",
    },
  },
];

export const PHASES: { id: string; name: string; from: number; to: number }[] =
  [
    { id: "set-up", name: "Set up", from: 1, to: 4 },
    { id: "prep", name: "Prep the ingredients", from: 5, to: 9 },
    { id: "make", name: "Make", from: 10, to: 18 },
    { id: "store", name: "Store and check", from: 19, to: 23 },
  ];

export const phaseOf = (n: number): (typeof PHASES)[number] =>
  PHASES.find((p) => n >= p.from && n <= p.to)!;
