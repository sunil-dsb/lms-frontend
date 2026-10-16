"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { LuArrowLeft } from "react-icons/lu";

/**
 * Back button that lives in the employee top bar. It only appears on the
 * procedure-detail route (`/<locale>/procedures/<id>`) — every other
 * employee-facing surface uses the bottom TabBar as its "back" affordance,
 * and a second back control there would be redundant.
 *
 * Behaviour: when the user navigated forward to the detail (i.e. there is
 * a same-origin referrer on this load), `router.back()` preserves scroll
 * position on the source page. Deep links (shared URL, new tab) have no
 * referrer — fall back to the procedures list.
 */
export function EmployeeTopBarBackButton({
  label,
}: {
  label: string;
}): React.ReactElement | null {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const isDetail = /^\/(?:en|es)\/procedures\/[^/]+$/.test(pathname);

  const [hasReferrer, setHasReferrer] = React.useState(false);
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const ref = document.referrer;
    if (!ref) return;
    try {
      const url = new URL(ref);
      if (url.origin === window.location.origin) setHasReferrer(true);
    } catch {
      // Malformed referrer — leave false and use the fallback.
    }
  }, []);

  if (!isDetail) return null;

  const onClick = (): void => {
    if (hasReferrer) {
      router.back();
    } else {
      // Hard fallback: jump to the procedures list. The locale prefix is
      // already on the current URL, so a relative path stays inside it.
      router.push("/procedures");
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="btn btn-ghost btn-icon btn-lg"
    >
      <LuArrowLeft aria-hidden="true" className="i" />
    </button>
  );
}
