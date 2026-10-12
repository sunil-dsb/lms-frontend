'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RowActions, type RowActionItem } from '@/components/ui/row-actions';
import { cn } from '@/lib/utils';
import { BilingualInput, type BilingualValue } from '@/components/ui/bilingual-input';
import { useCreateCategory, useUpdateCategory, useArchiveCategory } from '@/services/categories/hooks';
import type { Category } from '@/lib/types';
import {
  LuArchive,
  LuPencil,
  LuPlus,
  LuUndo2,
  LuChevronDown,
} from 'react-icons/lu';
import { IconTile } from '@/components/ui/icon-tile';
import {
  PiBookOpenText,
  PiBookOpenUser,
  PiChatCircle,
  PiCookingPot,
  PiDoorOpen,
  PiFileText,
  PiFire,
  PiFlame,
  PiFolder,
  PiForkKnife,
  PiHardHat,
  PiLightning,
  PiListChecks,
  PiPackage,
  PiShieldCheck,
  PiSnowflake,
  PiSparkle,
  PiThermometer,
  PiToolbox,
  PiUserCirclePlus,
  PiUserPlus,
  PiUsers,
} from 'react-icons/pi';

const AVAILABLE_ICONS = [
  { id: 'onboarding', label: 'Onboarding', icon: PiUserCirclePlus },
  { id: 'food-safety', label: 'Food Safety', icon: PiShieldCheck },
  { id: 'kitchen-operations', label: 'Kitchen Ops', icon: PiCookingPot },
  { id: 'cleaning', label: 'Cleaning', icon: PiSparkle },
  { id: 'opening-closing', label: 'Opening / Closing', icon: PiDoorOpen },
  { id: 'equipment', label: 'Equipment', icon: PiToolbox },
  { id: 'recipes', label: 'Recipes', icon: PiBookOpenText },
  { id: 'staff', label: 'Staff', icon: PiUsers },
  { id: 'training', label: 'Training', icon: PiBookOpenUser },
  { id: 'temperature', label: 'Temperature', icon: PiThermometer },
  { id: 'cold-storage', label: 'Cold Storage', icon: PiSnowflake },
  { id: 'hot-line', label: 'Hot Line', icon: PiFlame },
  { id: 'prep', label: 'Prep', icon: PiForkKnife },
  { id: 'service', label: 'Service', icon: PiUserPlus },
  { id: 'delivery', label: 'Delivery', icon: PiPackage },
  { id: 'communication', label: 'Communication', icon: PiChatCircle },
  { id: 'checklist', label: 'Checklist', icon: PiListChecks },
  { id: 'quick', label: 'Quick Reference', icon: PiLightning },
  { id: 'safety', label: 'Safety', icon: PiHardHat },
  { id: 'procedure', label: 'Procedure', icon: PiFileText },
  { id: 'cooking', label: 'Cooking', icon: PiFire },
  { id: 'folder', label: 'Other', icon: PiFolder },
] as const;

interface CategoryActionsProps {
  category: Category;
}

export function CategoryActions({ category }: CategoryActionsProps): React.ReactElement {
  const t = useTranslations('admin.library.categories');
  const tCommon = useTranslations('admin');
  const isEs = useLocale() === 'es';
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [renameOpen, setRenameOpen] = React.useState(false);

  const archiveMutation = useArchiveCategory();
  const updateMutation = useUpdateCategory();
  const pending = isPending || archiveMutation.isPending || updateMutation.isPending;

  const items: RowActionItem[] = React.useMemo(() => {
    const out: RowActionItem[] = [
      {
        label: t('renameAction'),
        icon: LuPencil,
        onSelect: () => setRenameOpen(true),
      },
    ];
    if (category.isArchived) {
      out.push({
        label: t('unarchive'),
        icon: LuUndo2,
        onSelect: () => {
          void runUnarchive(category);
        },
      });
    } else {
      out.push({
        label: t('archive'),
        icon: LuArchive,
        destructive: true,
        confirmTitle: isEs ? 'Archivar categorÃ­a' : 'Archive category',
        confirmDescription: isEs
          ? `"${category.nameEs || category.nameEn}" se archivarÃ¡. Puedes restaurarla mÃ¡s tarde.`
          : `"${category.nameEn}" will be archived. You can restore it later.`,
        confirmLabel: isEs ? 'SÃ­, archivar' : 'Yes, archive',
        onSelect: () => {
          void runArchive(category);
        },
      });
    }
    return out;
  }, [category, t]);

  async function runArchive(target: Category): Promise<void> {
    setError(null);
    try {
      await archiveMutation.mutateAsync(target.id);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  }

  async function runUnarchive(target: Category): Promise<void> {
    setError(null);
    try {
      await updateMutation.mutateAsync({ id: target.id, input: { isArchived: false } });
      router.refresh();
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  }

  return (
    <>
      <RowActions
        items={items}
        triggerLabel={`${tCommon('rowActionsLabel')}: ${category.nameEn}`}
        className={pending ? 'pointer-events-none opacity-50' : undefined}
      />
      {error ? (
        <span role="alert" className="sr-only">
          {error}
        </span>
      ) : null}

      <Modal
        open={renameOpen}
        onClose={() => {
          setRenameOpen(false);
          setError(null);
        }}
        size="md"
      >
        <CategoryForm
          key={category.id}
          mode="rename"
          category={category}
          pending={pending}
          error={error}
          onPendingChange={setIsPending}
          onErrorChange={setError}
          onDone={() => {
            setRenameOpen(false);
            router.refresh();
          }}
          onCancel={() => {
            setRenameOpen(false);
            setError(null);
          }}
          cancelLabel={t('cancel')}
          saveLabel={t('save')}
        />
      </Modal>
    </>
  );
}

export function CreateCategoryButton(): React.ReactElement {
  const t = useTranslations('admin.library.categories');
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function close(): void {
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <Button
        variant="primary"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="shrink-0 font-semibold shadow-2xs"
      >
        <LuPlus className="text-base" />
        <span>{t('addButton')}</span>
      </Button>

      <Modal open={open} onClose={close} size="md">
        <CategoryForm
          key="create"
          mode="create"
          category={null}
          pending={pending}
          error={error}
          onPendingChange={setPending}
          onErrorChange={setError}
          onDone={() => {
            close();
            router.refresh();
          }}
          onCancel={close}
          cancelLabel={t('cancel')}
          saveLabel={t('save')}
        />
      </Modal>
    </>
  );
}

interface CategoryFormProps {
  mode: 'create' | 'rename';
  category: Category | null;
  pending: boolean;
  error: string | null;
  onPendingChange: (v: boolean) => void;
  onErrorChange: (v: string | null) => void;
  onDone: () => void;
  onCancel: () => void;
  cancelLabel: string;
  saveLabel: string;
}

function CategoryForm({
  mode,
  category,
  pending,
  error,
  onPendingChange,
  onErrorChange,
  onDone,
  onCancel,
  cancelLabel,
  saveLabel,
}: CategoryFormProps): React.ReactElement {
  const locale = useLocale();
  const isEs = locale === 'es';

  const [name, setName] = React.useState<BilingualValue>({
    en: category?.nameEn ?? '',
    es: category?.nameEs ?? '',
  });
  const [icon, setIcon] = React.useState(category?.icon ?? 'onboarding');
  const [showIconPicker, setShowIconPicker] = React.useState(false);
  // `kind` is structural — it gates the Access step in the wizard and
  // decides whether the category lives under "By station" on the
  // categories page. Once a category exists with procedures, flipping
  // it would orphan those procedures, so the picker only appears at
  // create time; rename mode preserves the existing `kind`.
  const [kind, setKind] = React.useState<'general' | 'station-tied'>(
    category?.kind ?? 'general',
  );

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  async function submitCategory(): Promise<void> {
    if (pending) return;
    onErrorChange(null);
    onPendingChange(true);

    // Only one of EN / ES is required. Whichever is filled wins; the other
    // falls back to the filled one so the persisted record always has both
    // populated and the reader side (EN-first, ES-first) still works.
    const trimmedEn = name.en.trim();
    const trimmedEs = name.es.trim();
    const finalEn = trimmedEn || trimmedEs;
    const finalEs = trimmedEs || trimmedEn;

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          nameEn: finalEn,
          nameEs: finalEs,
          kind,
          icon,
        });
      } else if (category) {
        await updateMutation.mutateAsync({
          id: category.id,
          input: {
            nameEn: finalEn,
            nameEs: finalEs,
            icon,
          },
        });
      }
      onDone();
    } catch (err: any) {
      onErrorChange(err?.message || String(err));
    } finally {
      onPendingChange(false);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    void submitCategory();
  }

  // Either name is enough — Spanish is optional, English is optional, but at
  // least one has to be filled before the user can save.
  const canSubmit =
    !pending && (name.en.trim().length > 0 || name.es.trim().length > 0);
  const currentIconObj = AVAILABLE_ICONS.find((i) => i.id === icon) ?? AVAILABLE_ICONS[0];
  const CurrentIconComp = currentIconObj.icon;

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      <ModalHeader
        title={
          mode === 'create'
            ? isEs
              ? 'Crear categoría'
              : 'Create category'
            : isEs
              ? 'Editar categoría'
              : 'Edit category'
        }
        description={
          mode === 'create'
            ? isEs
              ? 'Agrega una categoría para organizar tus procedimientos.'
              : 'Add a category to organize your procedures in the library.'
            : isEs
              ? 'Cambia su nombre o su icono.'
              : 'Change its name or its icon.'
        }
        onClose={onCancel}
        closeLabel={isEs ? 'Cerrar' : 'Close'}
      />

      {/* The header draws no icon: the chosen one is previewed beside Choose
          icon below, and a second copy in the header was the same mark twice. */}
      <ModalBody className="max-h-[calc(100dvh-14rem)] overscroll-contain space-y-4">
        {/* Bilingual adaptive input for category name */}
        <div className="space-y-1.5">
          <BilingualInput
            label={isEs ? 'Nombre de la categoría' : 'Category name'}
            value={name}
            onChange={setName}
            maxLength={100}
            placeholder={{
              en: 'e.g. Food Safety',
              es: 'e.g. Seguridad Alimentaria',
            }}
          />
          <p className="text-xs text-[var(--color-ink-3)]">
            {isEs
              ? 'Al menos uno de los dos nombres es obligatorio.'
              : 'At least one of the two names is required.'}
          </p>
        </div>

        {/* Category-kind picker — only at create time. A radio group (not a
            dropdown) so the two options sit side by side and the
            description of each is visible without a second click. Matches
            the selected-state styling used by the icon picker below. */}
        {mode === 'create' && (
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-semibold text-[var(--color-ink)]">
              {isEs ? 'Tipo de categoría' : 'Category type'}
            </legend>
            <div
              role="radiogroup"
              aria-label={isEs ? 'Tipo de categoría' : 'Category type'}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            >
              <KindOption
                value="general"
                current={kind}
                onChange={setKind}
                title={isEs ? 'General' : 'General'}
                description={
                  isEs
                    ? 'Aplica a todas las estaciones. El wizard no pedirá una estación.'
                    : 'Applies to all stations. The wizard will not ask for a station.'
                }
              />
              <KindOption
                value="station-tied"
                current={kind}
                onChange={setKind}
                title={isEs ? 'Por estación' : 'Station-tied'}
                description={
                  isEs
                    ? 'Vive bajo "Por estación". El wizard pre-rellenará la estación elegida.'
                    : 'Lives under "By station". The wizard will pre-fill the chosen station.'
                }
              />
            </div>
          </fieldset>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="cat-icon-toggle">{isEs ? 'Icono' : 'Icon'}</Label>
          <div className="flex items-center gap-3">
            <IconTile size="md" icon={CurrentIconComp} />
            <Button
              id="cat-icon-toggle"
              type="button"
              variant="neutral"
              icon={LuChevronDown}
              aria-expanded={showIconPicker}
              onClick={() => setShowIconPicker(!showIconPicker)}
            >
              {isEs ? 'Elegir icono' : 'Choose icon'}
            </Button>
          </div>

          {showIconPicker && (
            <div className="mt-2 grid grid-cols-4 gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] p-2">
              {AVAILABLE_ICONS.map((item) => {
                const isSelected = icon === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setIcon(item.id);
                      setShowIconPicker(false);
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-[var(--radius-md)] border p-2 text-sm transition-colors',
                      isSelected
                        ? 'border-[var(--color-ring)] bg-[var(--color-brand-tint)] font-semibold text-[var(--color-brand-700)]'
                        : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:bg-[var(--color-panel)]',
                    )}
                  >
                    <IconComponent aria-hidden="true" className="text-lg" />
                    <span className="w-full truncate text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </ModalBody>

      <ModalFooter className="mb-3">
        <Button type="button" variant="neutral" onClick={onCancel} disabled={pending}>
          {cancelLabel}
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {error ? (
            <p role="alert" className="min-w-0 flex-1 text-left text-xs font-medium text-[var(--color-bad)]">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            variant="primary"
            disabled={!canSubmit}
            onClick={() => void submitCategory()}
          >
            {pending
              ? (isEs ? 'Guardando...' : 'Saving...')
              : mode === 'create'
                ? (isEs ? 'Crear' : 'Create')
                : saveLabel}
          </Button>
        </div>
      </ModalFooter>
    </form>
  );
}

interface KindOptionProps {
  value: 'general' | 'station-tied';
  current: 'general' | 'station-tied';
  onChange: (v: 'general' | 'station-tied') => void;
  title: string;
  description: string;
}

/** Single radio card for the kind picker. Uses a real <input type="radio">
 *  inside a <label> so keyboard / screen-reader / click-target semantics
 *  are free, and the surrounding label paints the selected-state chrome. */
function KindOption({
  value,
  current,
  onChange,
  title,
  description,
}: KindOptionProps): React.ReactElement {
  const checked = value === current;
  return (
    <label
      className={cn(
        'flex items-start gap-2.5 rounded-[var(--radius-md)] border p-3 cursor-pointer transition-colors',
        checked
          ? 'border-[var(--color-ring)] bg-[var(--color-brand-tint)]'
          : 'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-panel)]',
      )}
    >
      <input
        type="radio"
        name="category-kind"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-0.5 accent-[var(--color-brand-600)]"
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-semibold text-[var(--color-ink)]">{title}</span>
        <span className="text-xs text-[var(--color-ink-2)] leading-snug">{description}</span>
      </span>
    </label>
  );
}
