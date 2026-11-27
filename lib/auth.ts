import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "goodtime_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type AuthUser = {
  userId: string;
  email: string;
};

const PBKDF2_ITERATIONS = 100_000;
const HASH_ALGO = "SHA-256";

function getD1() {
  if (!env.DB) {
    throw new Error("資料庫尚未準備完成");
  }
  return env.DB;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
  const arr = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Format: pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGO,
    },
    keyMaterial,
    256,
  );
  const hashHex = bytesToHex(new Uint8Array(derivedBits));
  const saltHex = bytesToHex(salt);
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") return false;
    const iterations = parseInt(parts[1], 10);
    if (!iterations || iterations < 1000) return false;
    const salt = hexToBytes(parts[2]);
    const expectedHex = parts[3];

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"],
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: HASH_ALGO,
      },
      keyMaterial,
      256,
    );
    const actualHex = bytesToHex(new Uint8Array(derivedBits));
    return timingSafeEqualHex(actualHex, expectedHex);
  } catch {
    return false;
  }
}

export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: number;
}> {
  const db = getD1();
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = bytesToHex(tokenBytes);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  await db
    .prepare(
      "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    )
    .bind(token, userId, expiresAt, now)
    .run();

  return { token, expiresAt };
}

export async function deleteSession(token: string): Promise<void> {
  const db = getD1();
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(token).run();
}

export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const db = getD1();
    const now = Date.now();

    const row = await db
      .prepare(
        `SELECT u.id as userId, u.email as email, s.expires_at as expiresAt
         FROM sessions s
         INNER JOIN users u ON u.id = s.user_id
         WHERE s.id = ?`,
      )
      .bind(token)
      .first<{ userId: string; email: string; expiresAt: number }>();

    if (!row) return null;

    if (row.expiresAt <= now) {
      await db.prepare("DELETE FROM sessions WHERE id = ?").bind(token).run();
      return null;
    }

    return {
      userId: row.userId,
      email: row.email,
    };
  } catch {
    return null;
  }
}

export function buildSessionCookie(
  token: string,
  expiresAt: number,
  secure: boolean,
): string {
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${
    secure ? "; Secure" : ""
  }`;
}

export function buildClearSessionCookie(secure: boolean): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${
    secure ? "; Secure" : ""
  }`;
}
