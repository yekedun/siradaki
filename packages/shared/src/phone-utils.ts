export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[\s\-\(\)]/g, "");
  return /^(\+90|0)?[5][0-9]{9}$/.test(digits) || /^[0-9]{10,15}$/.test(digits);
}

/**
 * Normalizes a Turkish phone number to E.164 format (+90XXXXXXXXXX).
 * Returns null for numbers that cannot be mapped to a valid 10-digit Turkish mobile.
 */
export function normalizeToE164(phone: string): string | null {
  const stripped = phone.replace(/[\s\-\(\)]/g, "");

  if (/^\+90[5][0-9]{9}$/.test(stripped)) return stripped;
  if (/^90[5][0-9]{9}$/.test(stripped)) return `+${stripped}`;
  if (/^0[5][0-9]{9}$/.test(stripped)) return `+90${stripped.slice(1)}`;
  if (/^[5][0-9]{9}$/.test(stripped)) return `+90${stripped}`;

  return null;
}
