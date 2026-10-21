import "server-only";

/**
 * Server configuration, read lazily so `next build` never needs secrets.
 * Set these in apps/web/.env.local locally and in Vercel → Settings → Environment Variables.
 */
export interface ServerEnv {
  mongodbUri: string;
  jwtSecret: Uint8Array;
  jwtExpiresIn: string;
  isProduction: boolean;
}

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const mongodbUri = process.env.MONGODB_URI;
  const secret = process.env.JWT_SECRET;
  if (!mongodbUri) throw new Error("MONGODB_URI is not set");
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
  cached = {
    mongodbUri,
    jwtSecret: new TextEncoder().encode(secret),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
    isProduction: process.env.NODE_ENV === "production",
  };
  return cached;
}

/** For tests. */
export function resetServerEnv(): void {
  cached = null;
}
