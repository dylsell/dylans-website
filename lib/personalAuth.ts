export const PERSONAL_AUTH_COOKIE = "personal_auth";
export const PERSONAL_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

async function signSession(secret: string, expiresAt: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`personal-session:${expiresAt}`),
  );

  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function signaturesMatch(actual: string, expected: string) {
  if (actual.length !== expected.length) return false;

  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) {
    mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function createPersonalSessionToken(secret: string) {
  const expiresAt = Date.now() + PERSONAL_SESSION_TTL_SECONDS * 1000;
  const signature = await signSession(secret, expiresAt);
  return `${expiresAt}.${signature}`;
}

export async function verifyPersonalSessionToken(
  token: string | undefined,
  secret: string | undefined,
) {
  if (!token || !secret) return false;

  const [expiresAtValue, actualSignature, ...extraParts] = token.split(".");
  if (!expiresAtValue || !actualSignature || extraParts.length > 0) return false;

  const expiresAt = Number(expiresAtValue);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return false;

  const expectedSignature = await signSession(secret, expiresAt);
  return signaturesMatch(actualSignature, expectedSignature);
}

export function normalizePersonalRedirect(value: string | undefined) {
  if (!value) return "/personal";

  try {
    const base = new URL("https://personal.local");
    const target = new URL(value, base);
    if (
      target.origin !== base.origin ||
      !target.pathname.startsWith("/personal")
    ) {
      return "/personal";
    }
    return `${target.pathname}${target.search}`;
  } catch {
    return "/personal";
  }
}
