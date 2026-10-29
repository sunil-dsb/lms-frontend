/**
 * Server-only half of the view-as override.
 *
 * `lib/view-as` is client-safe (types, `parseAsParam`, `withAs`). This file
 * pulls in `next/headers` to read the request header the proxy injects, so
 * it must only be imported from server components / route handlers — never
 * from a `'use client'` module, otherwise the bundler pulls the App Router
 * server-only API into the browser bundle and the build errors out.
 */

import { headers } from "next/headers";
import { parseAsParam, type ViewAs } from "@/lib/view-as";

const HEADER = "x-lms-view-as";

/** Read the override from request headers — works from layouts and pages. */
export async function readViewAs(): Promise<ViewAs | null> {
  const h = await headers();
  return parseAsParam(h.get(HEADER));
}
