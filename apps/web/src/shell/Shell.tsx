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
    <div className="shell">
      <header className="shell__brand">
        <p className="shell__eyebrow">HyperLynx</p>
        <h1 className="shell__title">Tavelle</h1>
        <p className="shell__tagline">
          Multi-tenant CRM and client portal foundation. Branding hooks land
          later — no tenant logos hardcoded here.
        </p>
      </header>

      <section className="shell__status" aria-live="polite">
        <h2>API status</h2>
        {state.status === "loading" && <p>Checking /api/health…</p>}
        {state.status === "error" && (
          <p className="shell__error">
            Could not reach the API ({state.detail}). Start with{" "}
            <code>pnpm dev</code> so Vite proxies to Wrangler on :8787.
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
              <dd>{state.health.bindings.d1 ? "bound" : "unavailable"}</dd>
            </div>
            <div>
              <dt>R2</dt>
              <dd>{state.health.bindings.r2 ? "bound" : "unavailable"}</dd>
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
    </div>
  );
}
