"use client";

import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE ?? "",
  plugins: [magicLinkClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;

// Magic-link verify lives at `authClient.magicLink.verify({ query: { token, callbackURL } })`.
// It is not a top-level callable, so it is consumed directly off `authClient`
// rather than re-exported here — see app/[locale]/invite/[token]/invite-link-form.tsx.
