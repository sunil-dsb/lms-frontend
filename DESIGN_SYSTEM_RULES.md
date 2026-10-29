# Alimentaria LMS — Frontend Design System & Layout Rules

> **Core Requirement:** Consistency in layout structure, page container widths, typography, colors, spacing, and controls across the entire frontend application.

---

## 1. Page Layout & Container Width Consistency

Every page in the application must maintain a strict, uniform width hierarchy from top to bottom.

### Rules:

1. **Single Container Constraint per Page Route:**
   - Every page component must use a single outer wrapper with a standardized max-width:
     - **Standard Admin Pages / Forms / Settings:** `mx-auto max-w-5xl space-y-6`
     - **Data Explorers / Wide Tables:** `mx-auto max-w-6xl space-y-6`
   - **DO NOT** mix different max-widths on the same page (e.g., using `max-w-7xl` for header and `max-w-4xl` for form content).

2. **100% Inner Width Span (`w-full`):**
   - All page sections (breadcrumbs, action headers, page titles, category choice blocks, wizard steppers, form card groups, and action footers) must span `w-full` inside the page container.
   - Inner `<form>` tags or nested section wrappers must NOT apply a narrower `max-w-*` class that breaks vertical alignment with the header.

3. **Outer Padding Standard:**
   - Left and right padding is handled uniformly by the `AdminShell` main container (`px-4 sm:px-6 lg:px-10`). Pages should focus on internal vertical spacing (`space-y-6` or `space-y-8`).

---

## 2. Typography Rules

- **Display Font (`DM Sans` / `--font-display`):**
  - Used for large headings (28px / `--t-xl` and above: page titles, section titles).
  - Weight: Bold / Semibold (`700` or `600`), tight letter spacing (`-0.02em`).
- **UI Font (`Inter` / `--font-ui`):**
  - Used for all text, labels, inputs, table cells, and controls below 28px.
- **Text Floor & Sizes:**
  - **Admin Desk Density:** 14px (`--t-sm`) floor for body and inputs.
  - **Employee Phone Density:** 18px (`--t-md`) floor. 12px text is banned except tab-bar meta labels.

---

## 3. Color Tokens & Aesthetic System

- **Neutrals:**
  - Canvas / Cards: `#ffffff` (`--surface` / `--bg`)
  - Admin Background: `#f7f7f5` (`--bg-admin`)
  - Admin Chrome / Sidebars: `#f2f1ec` (`--panel`)
  - Hairline Borders: `#e5e4e0` (`--line`)
  - Card Edges: `#d0cec8` (`--line-2`)
- **Brand Terracotta Accent:**
  - Token: `#c94327` (`--brand-600`) for primary buttons, selected tabs, focus rings.
  - Secondary Peach Tint: `#fce8d4` (`--brand-tint`) with `#a8371f` (`--brand-700`) text.
  - **Rule:** Never use terracotta on more than ~10% of a screen.
- **Status Badges & Semantics:**
  - Complete / Verified: Green (`--ok-tint` `#dcfce7` / `--ok` `#166534`).
  - Due / Warning: Amber (`--warn-tint` `#fef3c7` / `--warn-ink` `#92400e`).
  - Overdue / Destructive: Red (`--bad-tint` `#fee2e2` / `--bad` `#b91c1c`).

---

## 4. Control Shapes & Badges

- **Buttons:** Always pills (`rounded-full` / `--r-pill`). Fully rounded shape signifies pressability.
- **Status Badges:** Always rectangular (`rounded-[var(--radius-sm)]` / `rounded-md`). Never pill-shaped status badges.
- **Inputs & Cards:** Rounded corners (`rounded-[var(--radius-md)]` / `8px` for inputs, `rounded-[var(--radius-lg)]` / `12px` for cards).

---

## 5. Verification Checklist for New Pages

Before signing off on any new page or component:

1. Verify top breadcrumb/header aligns vertically with all cards, steppers, and footers down the page.
2. Confirm zero inner max-width conflicts (e.g. no nested `max-w-4xl` inside a `max-w-7xl` container).
3. Check button shapes are pills and badge shapes are rectangles.
4. Verify interactive touch targets (36px for admin, 48px for employee).
