import { cookies } from "next/headers";
import {
  buildClearSessionCookie,
  buildSessionCookie,
  createSession,
  deleteSession,
  getSessionUser,
  SESSION_COOKIE_NAME,
  verifyPassword,
} from "@/lib/auth";
import { env } from "cloudflare:workers";

const fail = (message: string, status = 400) =>
  Response.json({ error: message }, { status });

export async function GET() {
  const user = await getSessionUser();
  return Response.json(
    { user },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    const reqUrl = new URL(req.url);
    if (origin && origin !== reqUrl.origin) {
      return fail("來源不符", 403);
    }

    if (!req.headers.get("content-type")?.includes("application/json")) {
      return fail("請使用 JSON");
    }

    const body = (await req.json()) as {
      action?: string;
      email?: string;
      password?: string;
    };
    const action = body?.action;
    const secure = reqUrl.protocol === "https:";

    if (action === "logout") {
      const cookieStore = await cookies();
      const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      if (token) {
        await deleteSession(token);
      }
      return Response.json(
        { ok: true },
        {
          headers: {
            "Set-Cookie": buildClearSessionCookie(secure),
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    if (action === "login") {
      const email = String(body?.email || "")
        .trim()
        .toLowerCase();
      const password = String(body?.password || "");

      if (!email || !password) {
        return fail("請輸入 Email 與密碼");
      }

      if (!env.DB) {
        return fail("資料庫尚未準備完成", 500);
      }

      const userRow = await env.DB.prepare(
        "SELECT id, email, password_hash FROM users WHERE lower(email) = ?",
      )
        .bind(email)
        .first<{ id: string; email: string; password_hash: string }>();

      if (!userRow) {
        return fail("帳號或密碼錯誤", 401);
      }

      const valid = await verifyPassword(password, userRow.password_hash);
      if (!valid) {
        return fail("帳號或密碼錯誤", 401);
      }

      const { token, expiresAt } = await createSession(userRow.id);

      return Response.json(
        {
          ok: true,
          user: { userId: userRow.id, email: userRow.email },
        },
        {
          headers: {
            "Set-Cookie": buildSessionCookie(token, expiresAt, secure),
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    return fail("不支援的操作");
  } catch (e) {
    console.error(e);
    return fail("登入處理失敗，請稍後重試", 500);
  }
}
