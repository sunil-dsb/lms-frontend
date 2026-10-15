'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  LuArchive,
  LuBookOpen,
  LuCheck,
  LuClock,
  LuCopy,
  LuFileText,
  LuFolder,
  LuGraduationCap,
  LuInbox,
  LuPencil,
  LuPlus,
  LuSearch,
  LuTrash2,
  LuUsers,
} from 'react-icons/lu';
import type { Token, TokenGroup } from '@/lib/design-tokens';
import { Avatar } from '@/components/ui/avatar';
import { BilingualInput, dummyTranslate, type BilingualValue } from '@/components/ui/bilingual-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomSelect } from '@/components/ui/custom-select';
import { Drawer } from '@/components/ui/drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterChips } from '@/components/ui/filter-chips';
import { IconTile } from '@/components/ui/icon-tile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Meter } from '@/components/ui/meter';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { MultiSelectChips } from '@/components/ui/multi-select-chips';
import { Popover, PopoverGroup, PopoverItem } from '@/components/ui/popover';
import { RowActions } from '@/components/ui/row-actions';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select } from '@/components/ui/select';
import { CountBadge, StatusPill } from '@/components/ui/status-pill';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { WizardStepper } from '@/components/ui/wizard-stepper';
import { CriticalLimit, Facts, MethodSteps, NoteBlock, Pill, PrepSteps, Yield } from '@/components/doc';
import './design-system.css';

/**
 * The design system page. Everything on it is the code itself: the tokens come
 * from app/lms.css (read on the server and handed in as `groups`), and every
 * specimen is the real component, so the page cannot show something the app
 * does not do. The sample content is a kitchen's, because that is what these
 * components carry.
 */

/* --- what a token is ----------------------------------------------------------- */

import { byPrefix, isColor, SECTIONS, Section, Specimen, TokenName, TokenTable } from './design-system-primitives';
import { DesignSystemTokenSections } from './design-system-token-sections';

export function DesignSystem({ groups }: { groups: TokenGroup[] }): React.ReactElement {
  const tApp = useTranslations('app');

  const colorGroups = groups
    .map((g) => ({ ...g, tokens: g.tokens.filter((t) => isColor(t.lightResolved)) }))
    .filter((g) => g.tokens.length);
  const typeScale = byPrefix(groups, (n) => /^--t-/.test(n));
  const leading = byPrefix(groups, (n) => /^--lh-/.test(n));
  const faces = byPrefix(groups, (n) => /^--(font-|display-|heading-track|caps-track)/.test(n));
  const space = byPrefix(groups, (n) => /^--s-\d+$/.test(n));
  const radius = byPrefix(groups, (n) => /^--r-/.test(n));
  const elevation = byPrefix(groups, (n) => /^--e-\d$/.test(n));
  const motion = byPrefix(groups, (n) => /^--(ease|dur|press)/.test(n));
  const taps = byPrefix(groups, (n) => /^--tap-/.test(n));
  const layers = byPrefix(groups, (n) => /^--z-/.test(n));
  const sizes = byPrefix(groups, (n) =>
    /^--(topbar-h|sidebar-w|sheet-|drawer-|field-|tile-|media-|list-|rail-w|page-w|doc-w|narrow-w|card-w|note-w|player-w)/.test(
      n,
    ),
  );
  const tokenCount = groups.reduce((n, g) => n + g.tokens.length, 0);

  /* Demo state */
  const [station, setStation] = React.useState('cold');
  const [view, setView] = React.useState('list');
  const [filter, setFilter] = React.useState('all');
  const [roles, setRoles] = React.useState<string[]>(['cook']);
  const [title, setTitle] = React.useState<BilingualValue>({ en: 'Guacamole Fresco', es: '' });
  const [step, setStep] = React.useState('content');
  const [modal, setModal] = React.useState(false);
  const [drawer, setDrawer] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLButtonElement>(null);
  const [active, setActive] = React.useState<string>('overview');

  // The section you are reading, marked in the index.
  React.useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const watch = new IntersectionObserver(
      (entries) => {
        const seen = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (seen[0]) setActive(seen[0].target.id);
      },
      { rootMargin: '-80px 0px -70% 0px' },
    );
    els.forEach((el) => watch.observe(el));
    return () => watch.disconnect();
  }, []);

  return (
    <div className="ds">
      <header className="ds-bar">
        <span className="ds-brand">
          <b>Alimentaria LMS</b>
          <span>Design system</span>
        </span>
        <ThemeToggle labels={{ toDark: tApp('themeToDark'), toLight: tApp('themeToLight') }} />
      </header>

      <div className="ds-layout">
        <nav className="ds-nav" aria-label="Design system sections">
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="ds-main">
          {/* ------------------------------------------------------------- overview */}
          <Section id="overview" title="Alimentaria LMS design system">
            <p className="ds-lead">
              The look and behaviour of the learning app, for everyone who builds it. Every value and every component on
              this page is read from the code, so it is always the current one.
            </p>
            <ul className="ds-facts">
              <li>
                <b>{tokenCount}</b>
                <span>tokens, from app/lms.css</span>
              </li>
              <li>
                <b>2</b>
                <span>themes, light and dark, same names</span>
              </li>
              <li>
                <b>2</b>
                <span>densities: the admin desk and the cook&apos;s phone</span>
              </li>
            </ul>
            <div className="ds-rules">
              <div>
                <h3>Tokens, never values</h3>
                <p>
                  A component takes its colour, size and space from a token such as <TokenName name="--brand-600" /> or{' '}
                  <TokenName name="--s-4" />. A hex code or a pixel value typed into a component is a bug: it will not
                  follow the theme, and the next change will miss it.
                </p>
              </div>
              <div>
                <h3>One colour for action</h3>
                <p>
                  Neutrals carry the interface. Terracotta is kept for what the reader can do or has chosen. Green,
                  amber and red mean what they mean everywhere, and always come with a word or an icon, never colour
                  alone.
                </p>
              </div>
              <div>
                <h3>Two densities</h3>
                <p>
                  The admin desk reads at 14px and taps at <TokenName name="--tap-admin" />. The employee side is read
                  on a phone, mid-shift: 16px and up, and every target <TokenName name="--tap-employee" />.
                </p>
              </div>
              <div>
                <h3>Written rules</h3>
                <p>
                  Page widths, the type floor and layout rules are in DESIGN_SYSTEM_RULES.md at the root of the frontend
                  repository.
                </p>
              </div>
            </div>
          </Section>

          {/* ---------------------------------------------------------------- colour */}
          <DesignSystemTokenSections
            colorGroups={colorGroups} typeScale={typeScale} leading={leading} faces={faces}
            space={space} radius={radius} elevation={elevation} motion={motion} taps={taps}
            sizes={sizes} layers={layers}
          />
          <Section
            id="buttons"
            title="Buttons"
            intro="One primary action per view. The mark goes after the label, so the eye finds the word first."
          >
            <Specimen
              name="Button"
              from="@/components/ui/button"
              about="Six variants and four sizes. Destructive is only for what cannot be undone."
              code={`<Button>Publish</Button>
<Button variant="secondary" icon={LuPlus}>New procedure</Button>
<Button variant="destructive">Delete</Button>
<Button size="icon" variant="ghost" aria-label="Search"><LuSearch /></Button>`}
              wide
            >
              <div className="ds-row">
                <Button>Publish</Button>
                <Button variant="secondary" icon={LuPlus}>
                  New procedure
                </Button>
                <Button variant="neutral">Cancel</Button>
                <Button variant="ghost">Skip for now</Button>
                <Button variant="surface" icon={LuCopy}>
                  Duplicate
                </Button>
                <Button variant="destructive" icon={LuTrash2}>
                  Delete
                </Button>
              </div>
              <div className="ds-row">
                <Button size="sm">Small</Button>
                <Button>Default</Button>
                <Button size="lg">Large, for the employee side</Button>
                <Button size="icon" variant="ghost" aria-label="Search">
                  <LuSearch />
                </Button>
                <Button disabled>Disabled</Button>
              </div>
            </Specimen>
          </Section>

          {/* ---------------------------------------------------------------- status */}
          <Section
            id="status"
            title="Status"
            intro="State is said in a word and shown in a colour, never the colour alone."
          >
            <div className="ds-grid">
              <Specimen
                name="StatusPill"
                from="@/components/ui/status-pill"
                about="The state of a procedure, a person or an assignment."
                code={`<StatusPill tone="ok" withDot>Published</StatusPill>
<CountBadge tone="bad">3</CountBadge>`}
              >
                <div className="ds-row">
                  <StatusPill tone="ok" withDot>
                    Published
                  </StatusPill>
                  <StatusPill tone="warn" withDot>
                    Due soon
                  </StatusPill>
                  <StatusPill tone="bad" withDot>
                    Overdue
                  </StatusPill>
                  <StatusPill tone="neutral">Draft</StatusPill>
                  <StatusPill tone="info" icon={LuClock}>
                    20 min
                  </StatusPill>
                  <StatusPill tone="progress" withDot>
                    In progress
                  </StatusPill>
                </div>
                <div className="ds-row">
                  <span className="ds-inline">
                    Needs review <CountBadge tone="warn">4</CountBadge>
                  </span>
                  <span className="ds-inline">
                    Overdue <CountBadge tone="bad">3</CountBadge>
                  </span>
                  <span className="ds-inline">
                    Team <CountBadge>12</CountBadge>
                  </span>
                </div>
              </Specimen>
              <Specimen
                name="Meter"
                from="@/components/ui/meter"
                about="A share of a whole, with the reading in the middle. Warn when the remainder is what needs attention."
                code={`<Meter value={9} total={12} label="75%" />`}
              >
                <div className="ds-row">
                  <Meter value={9} total={12} label="75%" size={56} />
                  <Meter value={3} total={12} label="3" tone="warn" size={56} />
                </div>
              </Specimen>
              <Specimen
                name="IconTile and Avatar"
                from="@/components/ui/icon-tile · avatar"
                about="A mark for a category or a person, in four sizes. Initials when there is no photo."
                code={`<IconTile icon={LuFolder} size="md" />
<Avatar initials="SH" size="md" />`}
              >
                <div className="ds-row">
                  <IconTile icon={LuFolder} size="xs" />
                  <IconTile icon={LuBookOpen} size="sm" />
                  <IconTile icon={LuGraduationCap} size="md" />
                  <IconTile icon={LuUsers} size="lg" tone="quiet" />
                  <Avatar initials="SH" />
                  <Avatar initials="RM" size="md" />
                </div>
              </Specimen>
            </div>
          </Section>

          {/* ---------------------------------------------------------------- inputs */}
          <Section
            id="inputs"
            title="Inputs"
            intro="A label above every field, always visible. The placeholder is an example, never the label."
          >
            <div className="ds-grid">
              <Specimen
                name="Input, Label, Select"
                from="@/components/ui/input · label · select"
                about="The native controls, styled once."
                code={`<Label htmlFor="title">Title</Label>
<Input id="title" placeholder="e.g. Cleaning the fryer" />`}
              >
                <div className="ds-field">
                  <Label htmlFor="ds-title">Title</Label>
                  <Input id="ds-title" placeholder="e.g. Cleaning the fryer" />
                </div>
                <div className="ds-field">
                  <Label htmlFor="ds-cat">Category</Label>
                  <Select id="ds-cat" defaultValue="food-safety">
                    <option value="food-safety">Food safety</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="recipes">Recipes</option>
                  </Select>
                </div>
              </Specimen>
              <Specimen
                name="BilingualInput"
                from="@/components/ui/bilingual-input"
                about="Every text a cook reads exists in English and Spanish. One field, two languages, a tab to switch."
                code={`<BilingualInput label="Title" value={value} onChange={setValue} translate={translate} />`}
              >
                <BilingualInput label="Title" value={title} onChange={setTitle} translate={dummyTranslate} />
              </Specimen>
            </div>
          </Section>

          {/* ------------------------------------------------------------- selection */}
          <Section id="selection" title="Selection">
            <div className="ds-grid">
              <Specimen
                name="CustomSelect"
                from="@/components/ui/custom-select"
                about="A select whose options carry an icon or a description."
                code={`<CustomSelect value={v} onChange={setV} options={[{ value: 'cold', label: 'Cold station' }]} />`}
              >
                <CustomSelect
                  value={station}
                  onChange={setStation}
                  options={[
                    { value: 'cold', label: 'Cold station', description: 'Salads, salsas, guacamole' },
                    { value: 'grill', label: 'Grill', description: 'Proteins and tortillas' },
                    { value: 'prep', label: 'Prep', description: 'Everything before service' },
                  ]}
                />
              </Specimen>
              <Specimen
                name="SegmentedControl"
                from="@/components/ui/segmented-control"
                about="Two to four views of the same thing."
                code={`<SegmentedControl label="View" value={v} onChange={setV} segments={[…]} />`}
              >
                <SegmentedControl
                  label="View"
                  value={view}
                  onChange={setView}
                  segments={[
                    { value: 'list', label: 'List' },
                    { value: 'grid', label: 'Grid' },
                    { value: 'calendar', label: 'Calendar' },
                  ]}
                />
              </Specimen>
              <Specimen
                name="FilterChips"
                from="@/components/ui/filter-chips"
                about="Narrow a list. Each chip says how many it will show."
                code={`<FilterChips label="Status" value={v} onChange={setV} chips={[{ value: 'all', label: 'All', count: 24 }]} />`}
              >
                <FilterChips
                  label="Status"
                  value={filter}
                  onChange={setFilter}
                  chips={[
                    { value: 'all', label: 'All', count: 24 },
                    { value: 'published', label: 'Published', count: 18 },
                    { value: 'draft', label: 'Draft', count: 4 },
                    { value: 'archived', label: 'Archived', count: 2 },
                  ]}
                />
              </Specimen>
              <Specimen
                name="MultiSelectChips"
                from="@/components/ui/multi-select-chips"
                about="Pick several from a list; what is picked stays visible as chips."
                code={`<MultiSelectChips label="Who reads this" value={v} onChange={setV} options={[…]} addLabel="Add a role" emptyText="Nobody yet" />`}
              >
                <MultiSelectChips
                  label="Who reads this"
                  value={roles}
                  onChange={setRoles}
                  options={[
                    { value: 'cook', label: 'Cook' },
                    { value: 'prep', label: 'Prep cook' },
                    { value: 'dish', label: 'Dishwasher' },
                    { value: 'foh', label: 'Front of house' },
                  ]}
                  addLabel="Add a role"
                  emptyText="Nobody yet"
                />
              </Specimen>
            </div>
          </Section>

          {/* ------------------------------------------------------------- progress */}
          <Section
            id="navigation"
            title="Progress"
            intro="Where you are in something with steps, and how much is left."
          >
            <Specimen
              name="WizardStepper"
              from="@/components/ui/wizard-stepper"
              about="Each step fills as the form behind it is filled in. The caller works out the progress."
              code={`<WizardStepper ariaLabel="New procedure" current="content" steps={[{ id: 'basics', label: 'Basics', progress: 1 }, …]} />`}
              wide
            >
              <WizardStepper
                ariaLabel="New procedure"
                current={step}
                onSelect={setStep}
                steps={[
                  { id: 'basics', label: 'Basics', progress: 1 },
                  { id: 'content', label: 'Content', progress: 0.5 },
                  { id: 'audience', label: 'Audience', progress: 0 },
                  { id: 'publish', label: 'Publish', progress: 0 },
                ]}
              />
            </Specimen>
          </Section>

          {/* ------------------------------------------------------------- feedback */}
          <Section
            id="feedback"
            title="Empty states"
            intro="Nothing here yet: say what is missing and offer the one way out."
          >
            <div className="ds-grid">
              <Specimen
                name="EmptyState"
                from="@/components/ui/empty-state"
                about="In place of a list that has nothing in it."
                code={`<EmptyState icon={LuInbox} title="No procedures yet" body="…" action={<Button>New procedure</Button>} />`}
              >
                <EmptyState
                  icon={LuInbox}
                  title="No procedures yet"
                  body="Write the first one, or import a document you already use."
                  action={<Button icon={LuPlus}>New procedure</Button>}
                />
              </Specimen>
              <Specimen
                name="EmptyState, compact"
                from="@/components/ui/empty-state"
                about="Inside a panel, where a full-height one would push everything away."
                code={`<EmptyState compact title="Nothing matches" body="…" />`}
              >
                <EmptyState compact title="Nothing matches" body="Try another word, or clear the filter." />
              </Specimen>
            </div>
          </Section>

          {/* ------------------------------------------------------------- overlays */}
          <Section
            id="overlays"
            title="Overlays"
            intro="Open one to see it. Escape, or the close button, brings you back."
          >
            <div className="ds-grid">
              <Specimen
                name="Modal"
                from="@/components/ui/modal"
                about="A short decision that has to be made before going on."
                code={`<Modal open={open} onClose={close}>
  <ModalHeader title="Publish this procedure?" onClose={close} />
  <ModalBody>…</ModalBody>
  <ModalFooter>…</ModalFooter>
</Modal>`}
              >
                <Button variant="secondary" onClick={() => setModal(true)}>
                  Open a modal
                </Button>
              </Specimen>
              <Specimen
                name="Drawer"
                from="@/components/ui/drawer"
                about="A side panel for detail that belongs to the page behind it."
                code={`<Drawer open={open} onClose={close} title="Sofía Hernández" footer={…}>…</Drawer>`}
              >
                <Button variant="secondary" onClick={() => setDrawer(true)}>
                  Open a drawer
                </Button>
              </Specimen>
              <Specimen
                name="Popover and RowActions"
                from="@/components/ui/popover · row-actions"
                about="A short menu from a button. A destructive item asks once more, in place."
                code={`<RowActions items={[{ label: 'Edit', icon: LuPencil, onSelect }, { label: 'Delete', destructive: true, onSelect }]} />`}
              >
                <div className="ds-row">
                  <Button ref={menuRef} variant="surface" onClick={() => setMenu((v) => !v)} aria-expanded={menu}>
                    Add a block
                  </Button>
                  <Popover open={menu} onClose={() => setMenu(false)} triggerRef={menuRef} align="start" width={260}>
                    <PopoverGroup label="Content">
                      <PopoverItem
                        icon={LuFileText}
                        label="Text"
                        description="A paragraph"
                        onClick={() => setMenu(false)}
                      />
                      <PopoverItem
                        icon={LuCheck}
                        label="Checklist"
                        description="Things to tick off"
                        onClick={() => setMenu(false)}
                      />
                    </PopoverGroup>
                  </Popover>
                  <RowActions
                    items={[
                      { label: 'Edit', icon: LuPencil, onSelect: () => undefined },
                      { label: 'Archive', icon: LuArchive, onSelect: () => undefined },
                      { label: 'Delete', icon: LuTrash2, destructive: true, onSelect: () => undefined },
                    ]}
                  />
                </div>
              </Specimen>
            </div>
          </Section>

          {/* ---------------------------------------------------------------- cards */}
          <Section id="cards" title="Cards">
            <Specimen
              name="Card"
              from="@/components/ui/card"
              about="A surface on the ground. Its edge separates it; the lift is only a breath."
              code={`<Card>
  <CardHeader><CardTitle>…</CardTitle><CardDescription>…</CardDescription></CardHeader>
  <CardContent>…</CardContent>
  <CardFooter>…</CardFooter>
</Card>`}
              wide
            >
              <div className="ds-ground">
                <Card>
                  <CardHeader>
                    <CardTitle>Cold holding</CardTitle>
                    <CardDescription>Food safety · updated 12 Aug 2026</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="ds-note">Probe every pan at the centre before service. 4 °C or below.</p>
                  </CardContent>
                  <CardFooter>
                    <StatusPill tone="ok" withDot>
                      Published
                    </StatusPill>
                  </CardFooter>
                </Card>
              </div>
            </Specimen>
          </Section>

          {/* ------------------------------------------------------------- document */}
          <Section
            id="document"
            title="The procedure document"
            intro="What a cook reads: a procedure or a recipe, on a phone. These are the blocks from components/doc, at the employee density."
          >
            <div className="ds-doc-frame">
              <article className="doc ds-doc">
                <Facts
                  items={[
                    { icon: 'folder', label: 'Category', value: 'Food safety' },
                    { icon: 'check', label: 'Status', value: 'Published', kind: 'ok' },
                    { icon: 'clock', label: 'Updated', value: '12 Aug 2026' },
                    { icon: 'languages', label: 'Languages', value: 'EN · ES' },
                  ]}
                />
                <div className="doc-sec">
                  <h2>Yield</h2>
                  <Yield
                    items={[
                      { label: 'Batch weight', value: '2.4 kg' },
                      { label: 'Portions', value: '12' },
                      { label: 'Portion size', value: '200 g' },
                      { label: 'Time', value: '20 min' },
                    ]}
                  />
                </div>
                <div className="doc-sec">
                  <h2>Before you start</h2>
                  <PrepSteps
                    steps={[
                      { id: 'ds-p1', label: 'Wash your hands for 20 seconds.' },
                      { id: 'ds-p2', label: 'Sanitise the board and the bench.', done: true },
                    ]}
                  />
                </div>
                <div className="doc-sec">
                  <h2>Method</h2>
                  <MethodSteps
                    nowIndex={1}
                    steps={[
                      { body: 'Cut each avocado lengthwise, all the way round the stone.', watchAt: '0:04' },
                      { body: 'Fold in all of the lime juice straight away.', watchAt: '0:48' },
                      { body: 'Before service, probe the centre of the pan and record the reading.', critical: true },
                    ]}
                  />
                  <CriticalLimit
                    icon="ri-thermometer-line"
                    value="4 °C (39 °F) or below"
                    subtitle="Into the walk-in within 30 minutes of finishing."
                    howToCheck="Probe the centre of the pan with a sanitised thermometer."
                    breach="If it is above 4 °C, discard it"
                  />
                </div>
                <div className="doc-sec">
                  <h2>Notes</h2>
                  <div className="ds-stack">
                    <NoteBlock kind="warn">
                      A blade that slips off a stone goes into your hand. Strike once, then twist.
                    </NoteBlock>
                    <NoteBlock kind="allergen">
                      Sesame enters here. Anything for an allergy ticket is made without it.
                    </NoteBlock>
                    <NoteBlock kind="tip">Scrape the skin clean: the flesh nearest it is the greenest.</NoteBlock>
                    <NoteBlock kind="alt">No molcajete? A fork in a steel bowl, the same coarse texture.</NoteBlock>
                    <NoteBlock kind="equip">Molcajete, bench scraper, quarter pan, probe thermometer.</NoteBlock>
                  </div>
                </div>
                <div className="doc-sec">
                  <h2>Training status</h2>
                  <div className="ds-row">
                    <Pill kind="complete">Complete</Pill>
                    <Pill kind="verified">Verified</Pill>
                    <Pill kind="progress">In progress</Pill>
                    <Pill kind="due">Due</Pill>
                    <Pill kind="overdue">Overdue</Pill>
                    <Pill kind="notstart">Not started</Pill>
                    <Pill kind="locked">Locked</Pill>
                  </div>
                </div>
              </article>
            </div>
            <pre className="ds-code">
              <code>{`import { Facts, MethodSteps, NoteBlock, CriticalLimit, Pill } from '@/components/doc';`}</code>
            </pre>
          </Section>
        </main>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Publish this procedure?">
        <ModalHeader
          title="Publish this procedure?"
          description="Everyone it is assigned to will see it the next time they open the app."
          onClose={() => setModal(false)}
        />
        <ModalBody>
          <p className="ds-note">Cold holding · Food safety · English and Spanish</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="neutral" onClick={() => setModal(false)}>
            Cancel
          </Button>
          <Button onClick={() => setModal(false)}>Publish</Button>
        </ModalFooter>
      </Modal>

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Sofía Hernández"
        footer={
          <>
            <Button variant="neutral" onClick={() => setDrawer(false)}>
              Close
            </Button>
            <Button onClick={() => setDrawer(false)}>Send a reminder</Button>
          </>
        }
      >
        <div className="ds-stack">
          <p className="ds-note">Line cook · Cold station</p>
          <div className="ds-row">
            <StatusPill tone="ok" withDot>
              9 done
            </StatusPill>
            <StatusPill tone="bad" withDot>
              1 overdue
            </StatusPill>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
