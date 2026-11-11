// Random, hard-to-guess codes for share links like /join/k3Jd9xQ2mPzr.
import { randomInt } from "node:crypto";

// URL-safe letters and digits, minus look-alikes (0/O, 1/l/I) so codes are easy to read aloud.
const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 12 characters from a 57-letter alphabet ≈ 70 bits of randomness. */
export function makeShareCode(length = 12): string {
  let code = "";
  for (let i = 0; i < length; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}
