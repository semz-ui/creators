export interface CredentialErrors {
  email?: string;
  password?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side credential validation, mirroring the server's rules. */
export function validateCredentials(
  email: string,
  password: string,
  { requireStrongPassword }: { requireStrongPassword: boolean },
): CredentialErrors {
  const errors: CredentialErrors = {};
  if (!EMAIL_RE.test(email.trim())) {
    errors.email = 'Enter a valid email address';
  }
  if (requireStrongPassword) {
    if (password.length < 8) errors.password = 'Password must be at least 8 characters';
  } else if (password.length === 0) {
    errors.password = 'Password is required';
  }
  return errors;
}

export const hasErrors = (errors: CredentialErrors): boolean => Object.keys(errors).length > 0;
