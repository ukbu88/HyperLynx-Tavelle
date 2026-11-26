import { useEffect, useState } from "react";
import type { HealthResponse } from "@tavelle/contracts";

type HelloResponse = {
  message: string;
  product: string;
  environment: string;
  requestId: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "ok"; health: HealthResponse; hello: HelloResponse }
  | { status: "error"; detail: string };

export function Shell() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [healthRes, helloRes] = await Promise.all([
          fetch("/api/health"),
          fetch("/api/hello"),
        ]);
        if (!healthRes.ok) {
          throw new Error(`Health failed (${healthRes.status})`);
        }
        if (!helloRes.ok) {
          throw new Error(`Hello failed (${helloRes.status})`);
        }
        const health = (await healthRes.json()) as HealthResponse;
        const hello = (await helloRes.json()) as HelloResponse;
        if (!cancelled) {
          setState({ status: "ok", health, hello });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            detail: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <header className="shell-header">
        <div className="shell-header__inner">
          <a className="shell-header__lockup" href="/" aria-label="Tavelle home">
            <span className="shell-header__mark" aria-hidden="true" />
            <span className="shell-header__wordmark">Tavelle</span>
          </a>
          <nav className="shell-header__nav" aria-label="Shell">
            <span className="shell-header__link" aria-current="page">
              Status
            </span>
          </nav>
        </div>
      </header>

      <main className="shell">
        <header className="shell__intro">
          <p className="shell__eyebrow">HyperLynx</p>
          <h1 className="shell__title">Foundation shell</h1>
          <p className="shell__tagline">
            Multi-tenant CRM and client portal foundation. Branding hooks land
            later — no tenant logos hardcoded here.
          </p>
        </header>

        <section className="shell__status" aria-live="polite">
          <h2>API status</h2>
          {state.status === "loading" && (
            <p className="shell__loading">Checking /api/health…</p>
          )}
          {state.status === "error" && (
            <p className="shell__error">
              Could not reach the API ({state.detail}). Start with{" "}
              <code className="shell__hint-link">pnpm dev</code> so Vite proxies
              to Wrangler on :8787.
            </p>
          )}
          {state.status === "ok" && (
            <dl className="shell__meta">
              <div>
                <dt>Hello</dt>
                <dd>{state.hello.message}</dd>
              </div>
              <div>
                <dt>Environment</dt>
                <dd>{state.hello.environment}</dd>
              </div>
              <div>
                <dt>D1</dt>
                <dd data-bound={String(state.health.bindings.d1)}>
                  {state.health.bindings.d1 ? "bound" : "unavailable"}
                </dd>
              </div>
              <div>
                <dt>R2</dt>
                <dd data-bound={String(state.health.bindings.r2)}>
                  {state.health.bindings.r2 ? "bound" : "unavailable"}
                </dd>
              </div>
              <div>
                <dt>Request</dt>
                <dd>
                  <code>{state.hello.requestId}</code>
                </dd>
              </div>
            </dl>
          )}
        </section>
      </main>
    </>
  );
}
