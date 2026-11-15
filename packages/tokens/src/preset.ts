import { normalizeInput, type ThemeInput } from "./theme.js";

const VERSION = 1;

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string): string {
  const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** A short, URL-safe code for a theme input (the same code works in the URL, CLI and MCP). */
export function encodePreset(input: ThemeInput): string {
  const { input: clean } = normalizeInput(input);
  return toBase64Url(JSON.stringify({ v: VERSION, ...clean }));
}

/** Decode a preset code. Invalid codes return null; unknown fields are dropped. */
export function decodePreset(code: string): ThemeInput | null {
  try {
    const data = JSON.parse(fromBase64Url(code.trim())) as { v?: number } & ThemeInput;
    if (data.v !== VERSION) return null;
    const { v: _v, ...rest } = data;
    return normalizeInput(rest).input;
  } catch {
    return null;
  }
}
