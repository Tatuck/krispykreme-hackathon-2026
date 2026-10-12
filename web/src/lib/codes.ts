import { randomInt } from "node:crypto";

// No 0/O/1/I/L to avoid misreads when cashiers type codes.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomCode(length: number, prefix = ""): string {
  let out = prefix;
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export const newTicketCode = () => randomCode(8, "T");
export const newGiftCode = () => randomCode(6, "G");

export function newRefCode(nameOrEmail: string): string {
  const base = nameOrEmail
    .split("@")[0]
    .normalize("NFD")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 5);
  return (base || "KK") + randomCode(3);
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}
