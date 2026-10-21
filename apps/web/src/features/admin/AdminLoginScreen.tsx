"use client";

import { motion } from "framer-motion";
import { Loader2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { AdminButton, Field } from "@/components/admin/ui";

/** Only same-site admin paths are allowed as the post-login destination. */
function safeNext(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
}

export function AdminLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        setError(response.status === 429 ? "Too many attempts. Wait a minute and try again." : (body.message ?? "Sign in failed"));
        return;
      }
      router.replace(safeNext());
      router.refresh();
    } catch {
      setError("Can't reach the server. Check your connection.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div data-admin-root className="bg-admin-page grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="bg-sidebar relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="bg-noise absolute inset-0 opacity-[0.08] mix-blend-overlay" />
        <div aria-hidden className="bg-title-glow absolute -top-32 -right-32 size-[520px] opacity-70 blur-3xl" />
        <p className="relative text-xs font-bold tracking-[0.3em] text-blush uppercase">Panoor · Admin</p>
        <div className="relative">
          <p className="text-glow -skew-x-8 font-display text-8xl leading-[0.85]">
            district
            <br />
            VIII
          </p>
          <p className="mt-6 max-w-sm text-blush">Approve bookings, manage tables and consoles, and keep the menu fresh.</p>
        </div>
        <p className="relative text-xs text-blush/70">3 pool tables · 2 PS5 stations · kitchen</p>
      </aside>

      <main className="flex items-center justify-center p-6">
        <motion.form
          noValidate
          onSubmit={(event) => void submit(event)}
          className="w-full max-w-sm rounded-card border border-burgundy/10 bg-white p-8 shadow-admin-lift"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        >
          <span className="bg-sidebar grid size-12 place-items-center rounded-full text-white shadow-admin-lift">
            <LockKeyhole aria-hidden className="size-5" />
          </span>
          <h1 className="mt-5 -skew-x-8 font-display text-4xl leading-none text-wine-ink">Admin sign in</h1>
          <p className="mt-2 text-sm text-wine-ink/60">District VIII staff only.</p>

          <div className="mt-6 space-y-4">
            <Field
              label="Email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoFocus
            />
            <Field
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-2xl bg-burgundy/8 px-4 py-2.5 text-sm font-semibold text-burgundy">
              {error}
            </p>
          )}

          <AdminButton type="submit" className="mt-6 w-full" disabled={pending}>
            {pending && <Loader2 aria-hidden className="size-4 animate-spin" />}
            {pending ? "Signing in…" : "Sign in"}
          </AdminButton>
        </motion.form>
      </main>
    </div>
  );
}
