import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

type ShopRow = {
  id: string;
  name: string;
  description: string;
  theme?: string | null;
};

const fail = (message: string, status = 400) =>
  Response.json({ error: message }, { status });

const db = () => {
  if (!env.DB) throw new Error("資料庫尚未準備完成");
  return env.DB;
};

let themeColEnsured = false;
async function ensureThemeColumn() {
  if (themeColEnsured) return;
  try {
    await db().prepare("ALTER TABLE shops ADD COLUMN theme text").run();
  } catch {
    // Column already exists
  }
  themeColEnsured = true;
}

const nowLocal = () =>
  new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16);

const validDate = (d: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d) &&
  new Date(d + "T00:00:00Z").toISOString().slice(0, 10) === d;

const validHex = (c: unknown): c is string =>
  typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c.trim());

export async function GET(req: Request) {
  try {
    await ensureThemeColumn();
    const u = new URL(req.url);
    const id = u.searchParams.get("shop");
    const month = u.searchParams.get("month");

    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return fail("月份格式不正確");
    }

    let shop: ShopRow | null = null;
    let owner = false;

    if (id) {
      if (id === "default") {
        shop = await db()
          .prepare("SELECT id, name, description, theme FROM shops LIMIT 1")
          .first<ShopRow>();
      } else {
        shop = await db()
          .prepare("SELECT id, name, description, theme FROM shops WHERE id = ?")
          .bind(id)
          .first<ShopRow>();
      }
    } else {
      const user = await getChatGPTUser();
      if (!user) return fail("請先登入", 401);

      shop = await db()
        .prepare("SELECT id, name, description, theme FROM shops WHERE owner = ?")
        .bind(user.userId)
        .first<ShopRow>();

      // Fallback: if single-studio mode and a shop already exists, bind/use it
      if (!shop) {
        shop = await db()
          .prepare("SELECT id, name, description, theme FROM shops LIMIT 1")
          .first<ShopRow>();
      }
      owner = true;
    }

    if (!shop) {
      return Response.json(
        { shop: null, slots: [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const columns = owner ? "*" : "id, shop_id, date, time, status";
    const rows = await db()
      .prepare(
        `SELECT ${columns} FROM slots WHERE shop_id = ? AND date LIKE ? ORDER BY date, time`,
      )
      .bind(shop.id, month + "-%")
      .all();

    return Response.json(
      { shop, slots: rows.results, serverTime: nowLocal() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error(e);
    return fail("讀取失敗，請稍後重試", 500);
  }
}

export async function POST(req: Request) {
  try {
    await ensureThemeColumn();
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) {
      return fail("來源不符", 403);
    }

    if (!req.headers.get("content-type")?.includes("application/json")) {
      return fail("請使用 JSON");
    }

    const raw = await req.text();
    if (raw.length > 12000) return fail("資料過長");
    const b = JSON.parse(raw);

    // Customer booking action (no login required)
    if (b.action === "book") {
      const name = String(b.name || "").trim();
      const phone = String(b.phone || "").trim();
      const note = String(b.note || "").trim();

      if (!name || name.length > 40) {
        return fail("請填寫您的名字或稱呼（限 40 字內）");
      }
      if (phone.length > 40) {
        return fail("聯絡方式限 40 字內");
      }
      if (note.length > 500) {
        return fail("備註限 500 字內");
      }

      const booking = crypto.randomUUID();
      const r = await db()
        .prepare(
          "UPDATE slots SET status = 'pending', customer = ?, phone = ?, note = ?, booking_id = ?, updated = ? WHERE id = ? AND shop_id = ? AND status = 'open' AND date || 'T' || time > ?",
        )
        .bind(
          name,
          phone || null,
          note || null,
          booking,
          Date.now(),
          String(b.slotId),
          String(b.shopId),
          nowLocal(),
        )
        .run();

      if (!r.meta.changes) {
        return fail("這個時段剛被預約、已關閉或已過期，請選其他時間", 409);
      }
      return Response.json({ ok: true, bookingId: booking });
    }

    // Studio owner actions (requires admin login)
    const user = await getChatGPTUser();
    if (!user) return fail("請先登入管理員帳號", 401);

    if (b.action === "create") {
      const name = String(b.name || "").trim();
      if (!name || name.length > 50) return fail("店名限 1–50 字");

      await db()
        .prepare(
          "INSERT OR IGNORE INTO shops (id, owner, name, description) VALUES (?, ?, ?, ?)",
        )
        .bind(
          crypto.randomUUID(),
          user.userId,
          name,
          "讓每一次相遇，都有剛剛好的時間。",
        )
        .run();

      return Response.json({ ok: true });
    }

    let shop = await db()
      .prepare("SELECT id FROM shops WHERE owner = ?")
      .bind(user.userId)
      .first<{ id: string }>();

    if (!shop) {
      shop = await db().prepare("SELECT id FROM shops LIMIT 1").first<{ id: string }>();
    }
    if (!shop) return fail("請先建立工作室", 404);

    if (b.action === "settings") {
      const name = String(b.name || "").trim();
      const desc = String(b.description || "").trim();
      if (!name || name.length > 50 || desc.length > 200) {
        return fail("店名限 50 字，介紹限 200 字");
      }
      await db()
        .prepare("UPDATE shops SET name = ?, description = ? WHERE id = ?")
        .bind(name, desc, shop.id)
        .run();
      return Response.json({ ok: true });
    }

    if (b.action === "theme") {
      const t = b.theme;
      if (
        !t ||
        typeof t !== "object" ||
        !validHex(t.primary) ||
        !validHex(t.accent) ||
        !validHex(t.bg)
      ) {
        return fail("請提供有效的 HEX 顏色格式（#RRGGBB）");
      }
      const themeJson = JSON.stringify({
        primary: t.primary.toLowerCase(),
        accent: t.accent.toLowerCase(),
        bg: t.bg.toLowerCase(),
      });
      await db()
        .prepare("UPDATE shops SET theme = ? WHERE id = ?")
        .bind(themeJson, shop.id)
        .run();
      return Response.json({ ok: true, theme: themeJson });
    }

    if (b.action === "add") {
      const date = String(b.date || "");
      if (!validDate(date)) return fail("日期不正確");

      const times = [
        ...new Set<string>(Array.isArray(b.times) ? b.times : []),
      ];
      if (!times.length || times.length > 24) {
        return fail("請輸入 1–24 個時間");
      }
      if (
        times.some(
          (t) =>
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(t) ||
            date + "T" + t <= nowLocal(),
        )
      ) {
        return fail("請選擇未來的有效時間");
      }

      await db().batch(
        times.map((t) =>
          db()
            .prepare(
              "INSERT OR IGNORE INTO slots (id, shop_id, date, time, status, updated) VALUES (?, ?, ?, ?, 'open', ?)",
            )
            .bind(crypto.randomUUID(), shop.id, date, t, Date.now()),
        ),
      );
      return Response.json({ ok: true });
    }

    const map: Record<string, [string, string[]]> = {
      confirm: ["booked", ["pending"]],
      reject: ["open", ["pending"]],
      close: ["closed", ["open"]],
      reopen: ["open", ["closed"]],
      cancel: ["open", ["booked"]],
    };

    if (!map[b.action]) return fail("不支援的操作");

    const [next, from] = map[b.action];
    const clear =
      next === "open"
        ? ", customer = NULL, phone = NULL, note = NULL, booking_id = NULL"
        : "";

    const r = await db()
      .prepare(
        `UPDATE slots SET status = ?, updated = ?${clear} WHERE id = ? AND shop_id = ? AND status = ?`,
      )
      .bind(next, Date.now(), String(b.slotId), shop.id, from[0])
      .run();

    if (!r.meta.changes) {
      return fail("時段狀態已更新，請重新整理", 409);
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return fail("操作失敗，請稍後重試", 500);
  }
}
