import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * Compares two secrets without leaking, through timing, how many leading characters match or how long the key is.
 * Both sides are hashed first so timingSafeEqual always compares two 32-byte digests.
 *
 * @param a - The key the caller sent.
 * @param b - The key this deployment expects.
 * @returns Whether they are equal.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}
