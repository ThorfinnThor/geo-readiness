// Typed auth errors. Messages are intentionally generic so responses do not
// leak whether an email exists or why a login failed.
export type AuthErrorCode =
  | "invalid_credentials"
  | "email_taken"
  | "rate_limited"
  | "invalid_token"
  | "email_not_verified"
  | "forbidden";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = "AuthError";
    this.code = code;
  }
}
