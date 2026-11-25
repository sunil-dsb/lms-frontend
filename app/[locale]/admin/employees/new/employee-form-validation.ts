export interface FieldErrors {
  name?: string;
  email?: string;
  locationId?: string;
  accessLevel?: string;
  roleIds?: string;
  stationIds?: string;
  employeeCode?: string;
  dateOfBirth?: string;
  fathersName?: string;
  gender?: string;
  address?: string;
  phoneNumber?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  startDate?: string;
  sinNumber?: string;
  hourlyRate?: string;
  supervisorIds?: string;
  managerIds?: string;
}

export interface FormState {
  name: string;
  email: string;
  locationId: string;
  accessLevel: "manager" | "supervisor" | "employee" | "";
  roleIds: string[];
  stationIds: string[];
  employeeCode: string;
  languagePref: "en" | "es";
  // Personal & Emergency & Payroll
  dateOfBirth: string;
  fathersName: string;
  gender: "male" | "female" | "other" | "prefer_not_to_say" | "";
  address: string;
  phoneNumber: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  startDate: string;
  sinNumber: string;
  hourlyRate: string;
  // Dynamic Reporting
  supervisorIds: string[];
  managerIds: string[];
}

export const MAX_NAME_LENGTH = 100;
export const MIN_NAME_LENGTH = 2;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const SIN_REGEX = /^(\d{3}-?\d{3}-?\d{3}|\d{9})$/;
export const HOURLY_RATE_REGEX = /^\d{1,4}(\.\d{1,2})?$/;

/**
 * Validates international / North American phone numbers:
 * - 10 to 15 digits
 * - Allows optional leading + and separators: spaces, hyphens, parentheses, dots
 * - Rejects non-phone symbols and repeating dummy digits (e.g. 0000000000)
 */
export function isValidPhoneNumber(val: string): boolean {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  if (!/^\+?[0-9\s\-().]{10,25}$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  return true;
}

/**
 * Validates calendar date string in YYYY-MM-DD format (checks real calendar days, e.g. Feb 31 invalid)
 */
export function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const parts = dateStr.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!year || !month || !day) return false;
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

/**
 * Validates date of birth: must be valid date, in the past, age between 14 and 100
 */
export function isValidDateOfBirth(dateStr: string): {
  valid: boolean;
  message?: string;
} {
  if (!isValidDate(dateStr)) {
    return {
      valid: false,
      message: "Date of birth must be a valid date in YYYY-MM-DD format",
    };
  }
  const parts = dateStr.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!year || !month || !day) {
    return { valid: false, message: "Invalid date values" };
  }
  const dob = new Date(year, month - 1, day);
  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  if (dob > today) {
    return { valid: false, message: "Date of birth cannot be in the future" };
  }
  if (age < 14) {
    return {
      valid: false,
      message: "Employee must be at least 14 years of age",
    };
  }
  if (age > 100) {
    return { valid: false, message: "Please enter a valid date of birth" };
  }
  return { valid: true };
}

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

  const setErr = (field: keyof FieldErrors, msg: string) => {
    errs[field] = msg;
    if (!firstErr) firstErr = msg;
  };

  // 1. Employee Details
  const trimmedName = form.name.trim();
  if (!trimmedName) {
    setErr("name", t("errorNeedName") || "Employee name is required");
  } else if (
    trimmedName.length < MIN_NAME_LENGTH ||
    trimmedName.length > MAX_NAME_LENGTH
  ) {
    setErr(
      "name",
      t("errorNameLength") ||
        `Employee name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`,
    );
  }

  const trimmedEmail = form.email.trim();
  if (!trimmedEmail) {
    setErr("email", t("errorNeedEmail") || "Email address is required");
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    setErr(
      "email",
      t("errorInvalidEmail") || "Please enter a valid email address",
    );
  }

  if (!form.locationId) {
    setErr(
      "locationId",
      t("errorNeedLocation") || "Location selection is required",
    );
  }

  // 2. Role & Hierarchy
  if (!form.accessLevel) {
    setErr(
      "accessLevel",
      t("errorNeedAccessLevel") || "Role level is required",
    );
  }

  if (form.roleIds.length === 0) {
    setErr(
      "roleIds",
      t("errorNeedJobRole") || "At least one job role is required",
    );
  }

  if (form.stationIds.length === 0) {
    setErr("stationIds", "At least one kitchen station is required");
  }

  if (form.accessLevel === "employee" && form.supervisorIds.length === 0) {
    setErr(
      "supervisorIds",
      "At least one reporting supervisor is required for employees",
    );
  }

  if (form.accessLevel === "supervisor" && form.managerIds.length === 0) {
    setErr(
      "managerIds",
      "At least one reporting manager is required for supervisors",
    );
  }

  // 3. Personal & Contact Details (REQUIRED)
  const trimmedDob = form.dateOfBirth.trim();
  if (!trimmedDob) {
    setErr("dateOfBirth", "Date of birth is required");
  } else {
    const dobCheck = isValidDateOfBirth(trimmedDob);
    if (!dobCheck.valid) {
      setErr("dateOfBirth", dobCheck.message || "Invalid date of birth");
    }
  }

  const trimmedFather = form.fathersName.trim();
  if (!trimmedFather) {
    setErr("fathersName", "Father's name is required");
  } else if (trimmedFather.length > 100) {
    setErr("fathersName", "Father's name cannot exceed 100 characters");
  }

  if (!form.gender) {
    setErr("gender", "Gender selection is required");
  }

  const trimmedAddress = form.address.trim();
  if (!trimmedAddress) {
    setErr("address", "Residential address is required");
  } else if (trimmedAddress.length > 500) {
    setErr("address", "Address cannot exceed 500 characters");
  }

  const trimmedPhone = form.phoneNumber.trim();
  if (!trimmedPhone) {
    setErr("phoneNumber", "Phone number is required");
  } else if (!isValidPhoneNumber(trimmedPhone)) {
    setErr(
      "phoneNumber",
      "Please enter a valid phone number (10 to 15 digits, e.g. 416-555-0199 or +1 416 555 0199)",
    );
  }

  // 4. Emergency Contact Details (REQUIRED)
  const trimmedEmName = form.emergencyContactName.trim();
  if (!trimmedEmName) {
    setErr("emergencyContactName", "Emergency contact name is required");
  } else if (trimmedEmName.length > 100) {
    setErr(
      "emergencyContactName",
      "Emergency contact name cannot exceed 100 characters",
    );
  }

  const trimmedEmRel = form.emergencyContactRelation.trim();
  if (!trimmedEmRel) {
    setErr(
      "emergencyContactRelation",
      "Emergency contact relationship is required",
    );
  } else if (trimmedEmRel.length > 50) {
    setErr(
      "emergencyContactRelation",
      "Relationship cannot exceed 50 characters",
    );
  }

  const trimmedEmPhone = form.emergencyContactPhone.trim();
  if (!trimmedEmPhone) {
    setErr("emergencyContactPhone", "Emergency contact phone is required");
  } else if (!isValidPhoneNumber(trimmedEmPhone)) {
    setErr(
      "emergencyContactPhone",
      "Please enter a valid emergency phone number (10 to 15 digits, e.g. 416-555-0199)",
    );
  }

  // 5. Employment & Compensation (REQUIRED)
  const trimmedStartDate = form.startDate.trim();
  if (!trimmedStartDate) {
    setErr("startDate", "Start / joining date is required");
  } else if (!isValidDate(trimmedStartDate)) {
    setErr("startDate", "Start date must be a valid date in YYYY-MM-DD format");
  }

  const trimmedSin = form.sinNumber.trim();
  if (!trimmedSin) {
    setErr("sinNumber", "Social Insurance Number (SIN) is required");
  } else if (!SIN_REGEX.test(trimmedSin)) {
    setErr("sinNumber", "SIN must be 9 digits (e.g. 123-456-789)");
  }

  const trimmedRate = form.hourlyRate.trim();
  if (!trimmedRate) {
    setErr("hourlyRate", "Hourly rate is required");
  } else if (
    !HOURLY_RATE_REGEX.test(trimmedRate) ||
    Number(trimmedRate) <= 0 ||
    Number(trimmedRate) > 9999.99
  ) {
    setErr(
      "hourlyRate",
      "Hourly rate must be a valid amount between $0.01 and $9999.99 (e.g. 21.50)",
    );
  }

  // 6. Employee Code - ONLY OPTIONAL FIELD
  const trimmedCode = form.employeeCode.trim();
  if (trimmedCode && trimmedCode.length !== 6) {
    setErr(
      "employeeCode",
      t("errorNeedCode") || "Employee code must be exactly 6 characters",
    );
  }

  return {
    isValid: Object.keys(errs).length === 0,
    errors: errs,
    firstError: firstErr,
  };
}
