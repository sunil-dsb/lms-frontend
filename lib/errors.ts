/**
 * Typed error for every backend response that didn't come back 2xx.
 *
 * The shape (`status`, `code`, `details`) mirrors what the Express
 * errorHandler emits in `lms-backend/src/shared/middleware/errorHandler.middleware.ts`:
 *
 *   { status, error: { code, message, details } }
 *
 * Axios' response interceptor (`lib/http.ts`) catches the raw `AxiosError`,
 * pulls that body, and re-throws as `ApiException` so call sites can do
 * `if (err instanceof ApiException)` regardless of which HTTP method fired.
 *
 * `lib/api.ts` (the mock layer) still re-exports `ApiException` from here so
 * imports don't move when the auth/employee/library methods get real traffic.
 */
export class ApiException extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: { path: string; message: string }[];

  public constructor(
    status: number,
    code: string,
    message: string,
    details: { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = "ApiException";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
