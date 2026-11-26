import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppHeader } from "../shell/AppHeader";
import { authClient } from "../lib/auth-client";
import { sanitizeNextPath, withNextParam } from "../lib/auth-redirect";

export function SignUpPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextPath = useMemo(
    () => sanitizeNextPath(params.get("next")) ?? "/app",
    [params],
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { error: err } = await authClient.signUp.email({
        name,
        email,
        password,
      });
      if (err) {
        setError(err.message ?? "Could not create account");
        return;
      }
      navigate(nextPath);
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
          <h1 className="shell__title">Create account</h1>
          <p className="shell__tagline">
            Creates your user identity only — organisation creation stays
            invite-only for platform admins.
          </p>
        </header>

        <form className="auth-form" onSubmit={(e) => void onSubmit(e)}>
          <label className="auth-field">
            <span>Name</span>
            <input
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
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
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="shell__error">{error}</p>}

          <button
            type="submit"
            className="auth-btn auth-btn--primary"
            disabled={pending}
          >
            {pending ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to={withNextParam("/sign-in", nextPath === "/app" ? null : nextPath)}>
            Sign in
          </Link>
        </p>
      </main>
    </>
  );
}
