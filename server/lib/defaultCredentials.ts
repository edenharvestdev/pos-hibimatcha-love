/** Seed/demo passwords that must be changed before production use. */
export const DEFAULT_PASSWORDS = new Set([
  "super2026",
  "admin2026",
  "staff2026",
]);

export const DEFAULT_PINS = new Set(["1234"]);

export function isDefaultPassword(password: string): boolean {
  return DEFAULT_PASSWORDS.has(password);
}

export function isDefaultPin(pin: string): boolean {
  return DEFAULT_PINS.has(pin);
}
