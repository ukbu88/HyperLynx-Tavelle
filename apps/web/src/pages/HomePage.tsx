import { Link } from "react-router-dom";
import { AppHeader } from "../shell/AppHeader";
import { authClient } from "../lib/auth-client";

export function HomePage() {
  const { data: session } = authClient.useSession();
  const email = session?.user?.email ?? null;

  return (
    <>
      <AppHeader email={email} />
      <main className="shell">
        <header className="shell__intro">
          <p className="shell__eyebrow">HyperLynx</p>
          <h1 className="shell__title">Tavelle</h1>
          <p className="shell__tagline">
            Multi-tenant CRM and client portal. Sign in with password or magic
            link — organisations are invite-provisioned.
          </p>
        </header>

        <section className="auth-cta" aria-label="Get started">
          {email ? (
            <Link className="auth-btn auth-btn--primary" to="/app">
              Open workspace
            </Link>
          ) : (
            <>
              <Link className="auth-btn auth-btn--primary" to="/sign-in">
                Sign in
              </Link>
              <Link className="auth-btn auth-btn--ghost" to="/sign-up">
                Create account
              </Link>
            </>
          )}
        </section>
      </main>
    </>
  );
}
