/**
 * Format "now + N hours" with the device's locale, so a cook sees the wall-clock
 * moment their batch must be discarded. Used on step screens that carry
 * `discardAt: true`. The Intl.DateTimeFormat options match the demo3 cook-mode
 * call site so the two readers say the same thing.
 *
 * Returns "—" when run on the server — formatting there would lock the format
 * to the build machine's locale, which is almost never what the cook sees.
 */
export function formatDiscardAt(hours: number = 48): string {
  if (typeof window === "undefined") return "—";
  const d = new Date(Date.now() + hours * 3600 * 1000);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
