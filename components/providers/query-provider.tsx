"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiException } from "@/lib/errors";

/**
 * TanStack Query provider with sensible defaults for the LMS.
 *
 * - `staleTime` 5 min: most LMS content (procedures, library, employees)
 *   changes on a timescale of minutes-to-days. Five minutes keeps a
 *   back-button navigation instant while still feeling fresh on reload.
 * - `refetchOnWindowFocus: false`: the kitchen's working set is large and
 *   re-rendering all cards on every alt-tab is jarring. Mutations invalidate
 *   their query keys explicitly.
 * - `retry` skips 4xx: those are caller errors (validation, auth,
 *   not-found), retrying just spams the backend. Network errors and 5xx
 *   get the default `failureCount < 2` retry.
 * - `mutations.retry: false`: a button-click mutation should not retry
 *   without the user's knowledge.
 */
export function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 30,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              if (
                error instanceof ApiException &&
                error.status >= 400 &&
                error.status < 500
              ) {
                return false;
              }
              return failureCount < 2;
            },
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
