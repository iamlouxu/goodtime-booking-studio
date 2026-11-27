#!/usr/bin/env node
import { webcrypto } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const PBKDF2_ITERATIONS = 100_000;

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await webcrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derivedBits = await webcrypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  const hashHex = bytesToHex(new Uint8Array(derivedBits));
  const saltHex = bytesToHex(salt);
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`;
}

function findLocalD1SqlitePath() {
  const dir = resolve(
    process.cwd(),
    ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
  );
  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".sqlite") && f !== "metadata.sqlite",
  );
  if (!files.length) {
    throw new Error(
      `找不到本機 D1 SQLite 檔案（目錄：${dir}），請先執行一次建置或 migration。`,
    );
  }
  return resolve(dir, files[0]);
}

function sqlEscape(str) {
  return str.replace(/'/g, "''");
}

function runSqlite(dbPath, sql) {
  return execFileSync("sqlite3", [dbPath, sql], { encoding: "utf8" }).trim();
}

async function main() {
  const [, , cmd, arg1, arg2] = process.argv;
  const dbPath = findLocalD1SqlitePath();

  if (cmd === "list") {
    const out = runSqlite(
      dbPath,
      "SELECT id, email, datetime(created_at/1000, 'unixepoch', '+8 hours') FROM users ORDER BY created_at;",
    );
    console.log(out || "(目前尚無管理員帳號)");
    return;
  }

  if (cmd === "delete" && arg1) {
    const email = arg1.trim().toLowerCase();
    runSqlite(
      dbPath,
      `PRAGMA foreign_keys = ON; DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE lower(email) = '${sqlEscape(email)}'); DELETE FROM users WHERE lower(email) = '${sqlEscape(email)}';`,
    );
    console.log(`已刪除帳號（及其所有有效登入 Session）：${email}`);
    return;
  }

  if ((cmd === "create" || cmd === "passwd") && arg1 && arg2) {
    const email = arg1.trim().toLowerCase();
    const password = arg2;
    const hash = await hashPassword(password);
    const now = Date.now();
    const id = webcrypto.randomUUID();

    const existingId = runSqlite(
      dbPath,
      `SELECT id FROM users WHERE lower(email) = '${sqlEscape(email)}' LIMIT 1;`,
    );

    if (existingId) {
      runSqlite(
        dbPath,
        `UPDATE users SET password_hash = '${sqlEscape(hash)}' WHERE id = '${sqlEscape(existingId)}';`,
      );
      console.log(`已更新帳號密碼：${email} (id: ${existingId})`);
    } else {
      runSqlite(
        dbPath,
        `INSERT INTO users (id, email, password_hash, created_at) VALUES ('${sqlEscape(id)}', '${sqlEscape(email)}', '${sqlEscape(hash)}', ${now});`,
      );
      console.log(`已建立管理員帳號：${email} (id: ${id})`);
    }
    return;
  }

  console.log(`用法：
  node scripts/manage-user.mjs list                          # 列出所有管理員帳號
  node scripts/manage-user.mjs create <email> <password>     # 新增或更新管理員帳號密碼
  node scripts/manage-user.mjs delete <email>                # 刪除帳號並立即踢除所有登入 Session`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

