/**
 * What this person opened last. Recorded on the device when a procedure is
 * read, so a future home surface (or a "recently read" widget somewhere
 * else) can offer the way back. Kept on the device: a phone is one
 * person's (the staff use their own devices), and it is a convenience, not
 * a record. The access log is the record.
 */

export interface RecentView {
  slug: string;
  titleEn: string;
  titleEs: string;
  cover?: string;
  /** Optional subcategory fields captured at record time so a future "recently
   *  read" surface can render the per-subcategory Phosphor mark without
   *  re-fetching the procedure. */
  subcategoryId?: string;
  /** Shape of the parent category's subcategories[] entry; slug + id are
   *  enough for the icon resolver. */
  subcategory?: { id: string; slug: string };
  at: string;
}

const KEY = "lms_recent_views";
const KEEP = 8;

export function recordRecentView(view: Omit<RecentView, "at">): void {
  try {
    const raw = window.localStorage.getItem(KEY);
    const prev: RecentView[] = raw ? (JSON.parse(raw) as RecentView[]) : [];
    const rest = prev.filter((v) => v.slug !== view.slug);
    const next = [{ ...view, at: new Date().toISOString() }, ...rest].slice(
      0,
      KEEP,
    );
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private window or storage off: the record is best-effort */
  }
}
