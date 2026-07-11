export interface CredentialErrors {
  email?: string;
  password?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  return EMAIL_RE.test(email.trim()) ? undefined : 'Enter a valid email address';
}

/** New-password policy, mirroring the server's 8–72 character rule. */
export function validateNewPassword(password: string): string | undefined {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 72) return 'Password must be at most 72 characters';
  return undefined;
}

/** Client-side credential validation, mirroring the server's rules. */
export function validateCredentials(
  email: string,
  password: string,
  { requireStrongPassword }: { requireStrongPassword: boolean },
): CredentialErrors {
  const errors: CredentialErrors = {};
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  if (requireStrongPassword) {
    if (password.length < 8) errors.password = 'Password must be at least 8 characters';
  } else if (password.length === 0) {
    errors.password = 'Password is required';
  }
  return errors;
}

export const hasErrors = (errors: CredentialErrors): boolean => Object.keys(errors).length > 0;
