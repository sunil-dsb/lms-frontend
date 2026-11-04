export interface FieldErrors {
  name?: string;
  email?: string;
  locationId?: string;
  accessLevel?: string;
  roleIds?: string;
  employeeCode?: string;
}

export interface FormState {
  name: string;
  email: string;
  locationId: string;
  accessLevel: "manager" | "employee" | "";
  roleIds: string[];
  stationIds: string[];
  employeeCode: string;
  languagePref: "en" | "es";
}

export const MAX_NAME_LENGTH = 50;
export const MIN_NAME_LENGTH = 2;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmployeeForm(
  form: FormState,
  t: (key: string) => string,
): {
  isValid: boolean;
  errors: FieldErrors;
  firstError: string | null;
} {
  const errs: FieldErrors = {};
  let firstErr: string | null = null;

  const trimmedName = form.name.trim();
  if (!trimmedName) {
    errs.name = t("errorNeedName");
    firstErr = firstErr ?? errs.name;
  } else if (
    trimmedName.length < MIN_NAME_LENGTH ||
    trimmedName.length > MAX_NAME_LENGTH
  ) {
    errs.name =
      t("errorNameLength") ||
      `Employee name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`;
    firstErr = firstErr ?? errs.name;
  }

  const trimmedEmail = form.email.trim();
  if (!trimmedEmail) {
    errs.email = t("errorNeedEmail");
    firstErr = firstErr ?? errs.email;
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errs.email = t("errorInvalidEmail");
    firstErr = firstErr ?? errs.email;
  }

  if (!form.locationId) {
    errs.locationId = t("errorNeedLocation");
    firstErr = firstErr ?? errs.locationId;
  }

  if (!form.accessLevel) {
    errs.accessLevel = t("errorNeedAccessLevel");
    firstErr = firstErr ?? errs.accessLevel;
  }

  if (form.roleIds.length === 0) {
    errs.roleIds = t("errorNeedJobRole");
    firstErr = firstErr ?? errs.roleIds;
  }

  const trimmedCode = form.employeeCode.trim();
  if (trimmedCode && trimmedCode.length !== 6) {
    errs.employeeCode = t("errorNeedCode");
    firstErr = firstErr ?? errs.employeeCode;
  }

  return {
    isValid: Object.keys(errs).length === 0,
    errors: errs,
    firstError: firstErr,
  };
}
