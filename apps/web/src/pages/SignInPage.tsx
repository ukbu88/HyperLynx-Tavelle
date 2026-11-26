import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppHeader } from "../shell/AppHeader";
import { authClient } from "../lib/auth-client";
import { sanitizeNextPath, withNextParam } from "../lib/auth-redirect";

type Mode = "password" | "magic";

export function SignInPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextPath = useMemo(
    () => sanitizeNextPath(params.get("next")) ?? "/app",
    [params],
  );
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      if (mode === "password") {
        const { error: err } = await authClient.signIn.email({
          email,
          password,
        });
        if (err) {
          setError(err.message ?? "Sign in failed");
          return;
        }
        navigate(nextPath);
        return;
      }

      const { error: err } = await authClient.signIn.magicLink({
        email,
        callbackURL: nextPath,
      });
      if (err) {
        setError(err.message ?? "Could not send magic link");
        return;
      }
      setMessage(
        "Magic link sent. Check your email — or Worker logs if email is stubbed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="shell auth-shell">
        <header className="shell__intro">
          <p className="shell__eyebrow">Account</p>
          <h1 className="shell__title">Sign in</h1>
          <p className="shell__tagline">
            Password or magic link. Org access still requires membership or an
            invite.
          </p>
        </header>

        <div className="auth-tabs" role="tablist" aria-label="Sign-in method">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "password"}
            className={
              mode === "password" ? "auth-tab auth-tab--active" : "auth-tab"
            }
            onClick={() => setMode("password")}
          >
            Password
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "magic"}
            className={mode === "magic" ? "auth-tab auth-tab--active" : "auth-tab"}
            onClick={() => setMode("magic")}
          >
            Magic link
          </button>
        </div>

        <form className="auth-form" onSubmit={(e) => void onSubmit(e)}>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {mode === "password" && (
            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}

          {error && <p className="shell__error">{error}</p>}
          {message && <p className="auth-message">{message}</p>}

          <button
            type="submit"
            className="auth-btn auth-btn--primary"
            disabled={pending}
          >
            {pending
              ? "Working…"
              : mode === "password"
                ? "Sign in"
                : "Send magic link"}
          </button>
        </form>

        <p className="auth-footer">
          No account yet?{" "}
          <Link to={withNextParam("/sign-up", nextPath === "/app" ? null : nextPath)}>
            Create one
          </Link>
        </p>
      </main>
    </>
  );
}
