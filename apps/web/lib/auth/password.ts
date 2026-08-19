// Password hashing with Argon2id (@node-rs/argon2), OWASP-aligned parameters.
// Argon2id is this library's default algorithm, so it is not set explicitly
// (its `Algorithm` export is a const enum, incompatible with isolatedModules).
import { hash, verify } from "@node-rs/argon2";

const PARAMS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

// Basic policy; fuller validation belongs at the API edge (Pydantic/zod).
export const MIN_PASSWORD_LENGTH = 10;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  return hash(password, PARAMS);
}

export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  try {
    return await verify(storedHash, password, PARAMS);
  } catch {
    // Malformed hash — treat as non-match rather than leaking an error.
    return false;
  }
}
