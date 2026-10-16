import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fold a string for searching: strip accents, lowercase. "Limpieza" and
 * "limpieza" are the same word to someone typing on a phone at the pass, and a
 * kitchen that works in two languages types both ways.
 */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
