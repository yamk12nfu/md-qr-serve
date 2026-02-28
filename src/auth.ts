import * as crypto from "crypto";
import { URL } from "url";

export function generateToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function validateToken(provided: string, expected: string): boolean {
  const normalizedProvided: string | null | undefined = provided as unknown as string | null | undefined;

  if (normalizedProvided == null || normalizedProvided.length === 0) {
    return false;
  }

  const providedBuffer: Buffer = Buffer.from(normalizedProvided, "utf8");
  const expectedBuffer: Buffer = Buffer.from(expected, "utf8");

  if (providedBuffer.length !== expectedBuffer.length) {
    crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

export function extractToken(url: string): string | null {
  try {
    const parsedUrl: URL = new URL(url, "http://localhost");
    return parsedUrl.searchParams.get("token");
  } catch {
    return null;
  }
}
