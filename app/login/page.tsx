"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          email,
          password,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "帳號或密碼錯誤");
        setBusy(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("連線失敗，請稍後重試");
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-split-card">
        <div className="login-card-left">
          <Link className="brand" href="/">
            <span className="brand-mark">
              <span />
            </span>
            <span>
              GOODTIME<small>BOOKING STUDIO</small>
            </span>
          </Link>
          <div className="login-brand-hero">
            <h1>
              把時間留給美好，
              <br />
              把預約交給<span>GOODTIME</span>！
            </h1>
          </div>
        </div>

        <div className="login-card-right">
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>登入</h2>
            <div className="login-fields">
              <input
                type="email"
                name="email"
                placeholder="Email address"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="login-error">{error}</p>}

            <button
              type="submit"
              className="btn pink-btn large login-submit-btn"
              disabled={busy}
            >
              {busy ? "登入中..." : "登入"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
