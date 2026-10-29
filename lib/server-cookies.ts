import { cookies } from "next/headers";

/**
 * The request's cookies as one header string, for server components that
 * call the API client directly — the axios auth interceptor only sees the
 * browser's cookies, so server-side calls need them forwarded explicitly
 * (see fetchEmployeeById / fetchTrainingProgressApi).
 */
export async function serverCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}
