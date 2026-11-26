import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { magicLink } from "better-auth/plugins";
import { createDb } from "@tavelle/db";
import * as schema from "@tavelle/db/schema";
import type { Env } from "../../env.js";
import { sendTransactionalEmail } from "./email.js";

export type AuthInstance = ReturnType<typeof createAuth>;

function resolveBaseURL(env: Env): string {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL.replace(/\/$/, "");
  if (env.ENVIRONMENT === "staging") {
    return "https://tavelle-api-staging.ukbu88.workers.dev";
  }
  // Local Vite proxy origin (cookies + magic links).
  return "http://127.0.0.1:5173";
}

function resolveSecret(env: Env): string {
  const secret = env.BETTER_AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (env.ENVIRONMENT === "development" || !env.ENVIRONMENT) {
    // Local-only fallback so `wrangler dev` works before secrets are set.
    return "dev-only-tavelle-better-auth-secret-change-me";
  }
  throw new Error("BETTER_AUTH_SECRET is required (min 32 chars)");
}

export function createAuth(env: Env) {
  const db = createDb(env.DB);
  const baseURL = resolveBaseURL(env);

  return betterAuth({
    appName: "Tavelle",
    baseURL,
    secret: resolveSecret(env),
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
    },
    trustedOrigins: [
      baseURL,
      "http://127.0.0.1:5173",
      "http://localhost:5173",
      "http://127.0.0.1:8787",
      "http://localhost:8787",
      "https://tavelle-api-staging.ukbu88.workers.dev",
    ],
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
      },
    },
    plugins: [
      magicLink({
        expiresIn: 60 * 30,
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }) => {
          await sendTransactionalEmail(env, {
            to: email,
            subject: "Sign in to Tavelle",
            text: `Use this magic link to sign in (expires in 30 minutes):\n\n${url}\n`,
          });
        },
      }),
    ],
  });
}
