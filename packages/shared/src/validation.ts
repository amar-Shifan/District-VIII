/** Validation rules shared by the API (class-validator) and the web forms (inline errors). */

export const CUSTOMER_NAME_MIN = 2;
export const CUSTOMER_NAME_MAX = 60;
export const REASON_MAX = 200;

/** Indian mobile: 10 digits starting 6 to 9, optionally prefixed with +91 (spaces or dashes allowed). */
export const INDIAN_PHONE_PATTERN = /^(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/;

/** Returns the canonical 10-digit number, or null when the input is not a valid Indian mobile. */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!INDIAN_PHONE_PATTERN.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  return digits.slice(-10);
}

export function validateCustomerName(input: string): string | null {
  const name = input.trim();
  if (name.length < CUSTOMER_NAME_MIN) return `Name must be at least ${CUSTOMER_NAME_MIN} characters`;
  if (name.length > CUSTOMER_NAME_MAX) return `Name must be at most ${CUSTOMER_NAME_MAX} characters`;
  return null;
}

export function validatePhone(input: string): string | null {
  if (!input.trim()) return "Phone number is required";
  return normalizePhone(input) ? null : "Enter a 10-digit Indian mobile number";
}

/** For logs: keeps only the last 3 digits. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length <= 3 ? "***" : `${"*".repeat(digits.length - 3)}${digits.slice(-3)}`;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : phone;
}
