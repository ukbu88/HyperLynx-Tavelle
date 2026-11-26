import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppHeader } from "../shell/AppHeader";
import { authClient } from "../lib/auth-client";
import { acceptInvite } from "../lib/api";

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const tokenFromUrl = useMemo(() => params.get("token") ?? "", [params]);
  const [token, setToken] = useState(tokenFromUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!session?.user) {
      setError("Sign in with the invited email first, then accept.");
      return;
    }
    setPending(true);
    try {
      const result = await acceptInvite(token.trim());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigate("/app");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AppHeader email={session?.user?.email ?? null} />
      <main className="shell auth-shell">
        <header className="shell__intro">
          <p className="shell__eyebrow">Invite</p>
          <h1 className="shell__title">Accept invite</h1>
          <p className="shell__tagline">
            Staff invites are single-use and hashed at rest. Sign in as the
            invited email before accepting.
          </p>
        </header>

        {!session?.user && (
          <p className="auth-message">
            <Link to={`/sign-in`}>Sign in</Link> or{" "}
            <Link to="/sign-up">create an account</Link> with the invited email.
          </p>
        )}

        <form className="auth-form" onSubmit={(e) => void onSubmit(e)}>
          <label className="auth-field">
            <span>Invite token</span>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              spellCheck={false}
            />
          </label>
          {error && <p className="shell__error">{error}</p>}
          <button
            type="submit"
            className="auth-btn auth-btn--primary"
            disabled={pending || !session?.user}
          >
            {pending ? "Accepting…" : "Accept invite"}
          </button>
        </form>
      </main>
    </>
  );
}
