import type { ReactNode } from "react";

/**
 * Settings chrome — outer container only. The page itself (header, eyebrow,
 * three panels) lives in `page.tsx`.
 *
 * The wrapper is a server component with no hooks so the parent layout chain
 * stays RSC for the static outer div.
 */
export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <div className="mx-auto w-full max-w-page space-y-6 pb-12">{children}</div>
  );
}
