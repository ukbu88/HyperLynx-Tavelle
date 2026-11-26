/**
 * Transactional email port — logs magic/invite links when no provider is wired.
 * Never log secrets other than single-use links needed for local/staging stub.
 */
export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

export async function sendTransactionalEmail(
  env: { EMAIL_API_KEY?: string; EMAIL_FROM?: string; ENVIRONMENT?: string },
  input: SendEmailInput,
): Promise<"logged" | "sent"> {
  if (!env.EMAIL_API_KEY) {
    console.info(
      JSON.stringify({
        type: "email_stub",
        to: input.to,
        subject: input.subject,
        text: input.text,
        environment: env.ENVIRONMENT ?? "unknown",
      }),
    );
    return "logged";
  }

  // Provider wiring (Resend/Postmark) is a Prince follow-up — keep stub until key exists.
  console.info(
    JSON.stringify({
      type: "email_provider_pending",
      to: input.to,
      subject: input.subject,
      from: env.EMAIL_FROM ?? null,
      note: "EMAIL_API_KEY set but provider adapter not implemented; logging body",
      text: input.text,
    }),
  );
  return "logged";
}
