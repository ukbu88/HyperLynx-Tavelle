import { Link, NavLink } from "react-router-dom";
import { authClient } from "../lib/auth-client";

type Props = {
  email?: string | null;
};

export function AppHeader({ email }: Props) {
  return (
    <header className="shell-header">
      <div className="shell-header__inner">
        <Link className="shell-header__lockup" to="/" aria-label="Tavelle home">
          <span className="shell-header__mark" aria-hidden="true" />
          <span className="shell-header__wordmark">Tavelle</span>
        </Link>
        <nav className="shell-header__nav" aria-label="Shell">
          {email ? (
            <>
              <NavLink
                to="/app"
                className={({ isActive }) =>
                  isActive
                    ? "shell-header__link shell-header__link--btn"
                    : "shell-header__link shell-header__link--btn"
                }
                aria-current={undefined}
              >
                Workspace
              </NavLink>
              <span className="shell-header__meta">{email}</span>
              <button
                type="button"
                className="shell-header__link shell-header__link--btn"
                onClick={() => void authClient.signOut()}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/sign-in" className="shell-header__link shell-header__link--btn">
                Sign in
              </NavLink>
              <NavLink to="/sign-up" className="shell-header__link shell-header__link--btn">
                Create account
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
