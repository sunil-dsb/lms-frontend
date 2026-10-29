import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);
export default function proxy(request: NextRequest): NextResponse {
  const legacyInviteMatch = request.nextUrl.pathname.match(
    /^\/([a-z]{2})\/invite\/.+\/api\/v1\/auth\/invites\/[a-z]{2}\/([^/]+)\/?$/i,
  );
  if (legacyInviteMatch) {
    const [, locale, inviteCode] = legacyInviteMatch;
    const normalizedUrl = request.nextUrl.clone();
    normalizedUrl.pathname = `/${locale}/invite/${encodeURIComponent(inviteCode)}`;
    return NextResponse.redirect(normalizedUrl, 308);
  }

  const asParam = request.nextUrl.searchParams.get("as");
  const viewAs = asParam === "admin" || asParam === "employee" ? asParam : null;
  let intlRequest: NextRequest = request;
  if (viewAs) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-lms-view-as", viewAs);
    intlRequest = new NextRequest(request.nextUrl, { headers: requestHeaders });
  }

  const intlResponse = intlMiddleware(intlRequest);

  // Stamp the cookie on the response so the choice survives navigation
  // through links that don't carry `?as=` (relative links, redirects, etc).
  if (viewAs) {
    intlResponse.cookies.set("lms_view_as", viewAs, {
      path: "/",
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
    });
  }
  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/:locale/invite/:path*"],
};
