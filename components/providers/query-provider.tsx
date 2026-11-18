"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiException } from "@/lib/errors";

/**
 * TanStack Query provider — fresh data whenever it is needed, no result cache.
 *
 * - `staleTime: 0`: every query is stale the moment it is created, so each
 *   page view fetches fresh from the API — nothing is ever served from a
 *   previous visit.
 * - `refetchOnWindowFocus: false`: focusing a tab is not a data need, so it
 *   does not fire API calls (this was the request-storm source).
 * - `gcTime` only controls how long an unused response stays in memory as an
 *   instant placeholder; it never triggers a fetch.
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
            staleTime: 0,
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
