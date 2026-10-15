import type {
  Localised,
  LocalisedOptional,
  ProcedureBlock,
  ProcedureNoteKind,
} from '@/lib/types';

export type BodyProps<T extends ProcedureBlock> = {
  block: T;
  onPatch: (next: T) => void;
};

export function asLoc(value: Localised | undefined, lang: 'en' | 'es'): string {
  return value?.[lang] ?? '';
}

export function setLoc(value: Localised | undefined, lang: 'en' | 'es', text: string): Localised {
  return { en: value?.en ?? '', es: value?.es ?? '', [lang]: text };
}

export function asOpt(value: LocalisedOptional | undefined, lang: 'en' | 'es'): string {
  return value?.[lang] ?? '';
}

export function setOpt(value: LocalisedOptional | undefined, lang: 'en' | 'es', text: string): LocalisedOptional {
  return { en: value?.en, es: value?.es, [lang]: text };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/jfif', 'image/png',
  'image/webp', 'image/gif', 'image/avif', 'image/svg+xml', 'image/bmp',
]);
const ALLOWED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|avif|svg|bmp|jfif|pjpeg)$/i;

export function isAllowedImageFile(file: File): boolean {
  if (!file) return false;
  if (file.type && (file.type.startsWith('image/') || ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase()))) {
    return true;
  }
  return ALLOWED_IMAGE_EXTENSIONS.test(file.name);
}

export const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const NOTE_KINDS: ProcedureNoteKind[] = ['warn', 'tip', 'alt', 'equip', 'allergen'];

export const SLASH_BLOCK_OPTIONS: Array<{ kind: import('@/lib/types').ProcedureBlockKind; label: string; icon: string }> = [
  { kind: 'text', label: 'Text', icon: 'ri-text' },
  { kind: 'heading', label: 'Heading', icon: 'ri-h-1' },
  { kind: 'method', label: 'Steps', icon: 'ri-list-ordered' },
  { kind: 'checklist', label: 'Checklist', icon: 'ri-list-check' },
  { kind: 'table', label: 'Table', icon: 'ri-table-line' },
  { kind: 'warning', label: 'Callout', icon: 'ri-alert-line' },
  { kind: 'image', label: 'Image', icon: 'ri-image-line' },
  { kind: 'video', label: 'Video', icon: 'ri-video-line' },
  { kind: 'attachment', label: 'Attachment', icon: 'ri-attachment-line' },
  { kind: 'ingredients', label: 'Ingredients', icon: 'ri-restaurant-line' },
];
