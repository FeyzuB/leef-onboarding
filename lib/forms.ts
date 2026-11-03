import type { ContactRole } from '@prisma/client';

/** Result shape for forms that show an inline message (used with useActionState). */
export type FormState = { error?: string; success?: string };

export function text(form: FormData, key: string, max = 4000): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function required(form: FormData, key: string, label: string, max = 200): string {
  const value = text(form, key, max);
  if (!value) throw new Error(`${label} is required`);
  return value;
}

export function optionalInt(form: FormData, key: string, min: number, max: number): number | null {
  const value = text(form, key, 10);
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${key} must be a whole number between ${min} and ${max}`);
  }
  return parsed;
}

/** A step's contact: a role (the plan's manager or buddy) or free text, never both. */
export function contactFields(form: FormData): { contactRole: ContactRole | null; contact: string } {
  const value = text(form, 'contactRole');
  const contactRole = value === 'MANAGER' || value === 'BUDDY' ? value : null;
  return { contactRole, contact: contactRole ? '' : text(form, 'contact', 200) };
}

export function direction(form: FormData): 'up' | 'down' {
  return text(form, 'direction') === 'up' ? 'up' : 'down';
}

export const MIN_PASSWORD_LENGTH = 10;

export function validateNewPassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  if (password.length > 200) return 'Password is too long';
  return null;
}

export function normaliseUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return /^[a-z0-9._-]{3,50}$/.test(value);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}
