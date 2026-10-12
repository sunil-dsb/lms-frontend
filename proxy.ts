import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

/**
 * View-as override.
 *
 * Until the real login flow lands, every demo session resolves as the seed
 * admin. Procedures routes default to employee chrome (they're reading
 * content, not management screens), so `?as=admin` on a URL is what opts a
 * procedure page into the `AdminShell`. The procedure layout (which only
 * receives `params`, not `searchParams` in this version of Next.js) reads
 * the override from the request header set here.
 *
 *   ?as=admin    → x-lms-view-as: admin     + cookie `lms_view_as=admin`
 *   ?as=employee → x-lms-view-as: employee  + cookie `lms_view_as=employee`
 *   (no param)   → header unset, layout defaults to employee chrome
 *
 * The cookie is what makes the override survive navigation: links emitted
 * from a procedure surface already carry `?as=` (via `withAs`), so the proxy
 * keeps stamping the header on every page. Clearing the cookie (or visiting
 * any URL without `?as=`) snaps the chrome back to the default.
 */
export default function proxy(request: NextRequest): NextResponse {
  // Normalize malformed legacy invite links where the backend URL and API
  // path were embedded in the frontend invite route, e.g.
  // /en/invite/api.example.com/api/v1/auth/invites/en/<code>.
  const legacyInviteMatch = request.nextUrl.pathname.match(
    /^\/([a-z]{2})\/invite\/.+\/api\/v1\/auth\/invites\/[a-z]{2}\/([^/]+)\/?$/i,
  );
  if (legacyInviteMatch) {
    const [, locale, inviteCode] = legacyInviteMatch;
    const normalizedUrl = request.nextUrl.clone();
    normalizedUrl.pathname = `/${locale}/invite/${encodeURIComponent(inviteCode)}`;
    return NextResponse.redirect(normalizedUrl, 308);
  }

  const asParam = request.nextUrl.searchParams.get('as');
  const viewAs = asParam === 'admin' || asParam === 'employee' ? asParam : null;

  // Augment the request headers with our override BEFORE handing it to
  // next-intl. next-intl's middleware builds its response by copying
  // `request.headers` into a new Headers object (see next-intl/dist/.../
  // middleware/middleware.js), so anything we set here flows downstream to
  // layouts and pages via the standard `headers()` API.
  let intlRequest: NextRequest = request;
  if (viewAs) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-lms-view-as', viewAs);
    intlRequest = new NextRequest(request.nextUrl, { headers: requestHeaders });
  }

  const intlResponse = intlMiddleware(intlRequest);

  // Stamp the cookie on the response so the choice survives navigation
  // through links that don't carry `?as=` (relative links, redirects, etc).
  if (viewAs) {
    intlResponse.cookies.set('lms_view_as', viewAs, {
      path: '/',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
    });
  }
  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/:locale/invite/:path*'],
};
