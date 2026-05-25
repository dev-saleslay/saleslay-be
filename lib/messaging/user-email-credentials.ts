import { decryptEmailApiKey } from "@/lib/messaging/email-api-key-crypto";
import {
  getSendGridApiKey,
  isSendGridConfigured as isSendGridConfiguredOnServer,
} from "@/lib/messaging/sendgrid-email-provision";
import {
  getResendApiKey,
  getResendDefaultFromEmail as getResendDefaultFromEnv,
  isResendConfigured as isResendConfiguredOnServer,
} from "@/lib/messaging/resend-mail";
import { getSendGridDefaultFromEmail as getSendGridDefaultFromEnv } from "@/lib/messaging/sendgrid-send-mail";
import { prisma } from "@/lib/prisma";

export type EmailDeliveryProviderId = "NONE" | "SENDGRID" | "RESEND";

function tryDecrypt(enc: string | null | undefined): string | null {
  if (!enc?.trim()) return null;
  try {
    return decryptEmailApiKey(enc.trim());
  } catch {
    return null;
  }
}

async function getStoredEmailDeliveryProvider(userId: string): Promise<EmailDeliveryProviderId> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailDeliveryProvider: true },
  });
  const v = u?.emailDeliveryProvider;
  if (v === "SENDGRID" || v === "RESEND") return v;
  return "NONE";
}

export function resolveEffectiveEmailDeliveryProvider(
  stored: EmailDeliveryProviderId,
  sendgridHasApiKey: boolean,
  resendHasApiKey: boolean,
): EmailDeliveryProviderId {
  if (stored !== "NONE") return stored;
  if (sendgridHasApiKey && !resendHasApiKey) return "SENDGRID";
  if (resendHasApiKey && !sendgridHasApiKey) return "RESEND";
  return "NONE";
}

export type EmailDeliveryResolution = {
  stored: EmailDeliveryProviderId;
  effective: EmailDeliveryProviderId;
  needsEmailProviderChoice: boolean;
  sendgridConfigured: boolean;
  resendConfigured: boolean;
  sendgridCanSend: boolean;
  resendCanSend: boolean;
  sendgridUserKeySaved: boolean;
  resendUserKeySaved: boolean;
  sendgridFromEmailSaved: string | null;
  resendFromEmailSaved: string | null;
  sendgridOutboundFromConfigured: boolean;
  resendDefaultFromConfigured: boolean;
};

export async function getEmailDeliveryResolution(userId: string): Promise<EmailDeliveryResolution> {
  const [stored, row] = await Promise.all([
    getStoredEmailDeliveryProvider(userId),
    prisma.emailProviderIntegration.findUnique({ where: { userId } }),
  ]);

  const sendgridUserKeySaved = Boolean(row?.sendgridApiKeyEnc?.trim());
  const resendUserKeySaved = Boolean(row?.resendApiKeyEnc?.trim());

  const envSgKey = isSendGridConfiguredOnServer();
  const envRsKey = isResendConfiguredOnServer();

  const sendgridConfigured = sendgridUserKeySaved || envSgKey;
  const resendConfigured = resendUserKeySaved || envRsKey;

  const sendgridFromSaved = row?.sendgridFromEmail?.trim() || null;
  const resendFromSaved = row?.resendFromEmail?.trim() || null;
  const sendgridOutboundFromConfigured = Boolean(
    sendgridFromSaved || getSendGridDefaultFromEnv()?.trim(),
  );
  const resendDefaultFromConfigured = Boolean(resendFromSaved || getResendDefaultFromEnv()?.trim());

  const sendgridKeyPlain =
    tryDecrypt(row?.sendgridApiKeyEnc ?? null) ?? getSendGridApiKey();
  const resendKeyPlain = tryDecrypt(row?.resendApiKeyEnc ?? null) ?? getResendApiKey();

  const sendgridCanSend = Boolean(
    sendgridKeyPlain?.trim() &&
      (sendgridFromSaved || getSendGridDefaultFromEnv()?.trim()),
  );
  const resendCanSend = Boolean(
    resendKeyPlain?.trim() && (resendFromSaved || getResendDefaultFromEnv()?.trim()),
  );

  const effective = resolveEffectiveEmailDeliveryProvider(
    stored,
    sendgridConfigured,
    resendConfigured,
  );

  const needsEmailProviderChoice =
    stored === "NONE" && sendgridConfigured && resendConfigured;

  return {
    stored,
    effective,
    needsEmailProviderChoice,
    sendgridConfigured,
    resendConfigured,
    sendgridCanSend,
    resendCanSend,
    sendgridUserKeySaved,
    resendUserKeySaved,
    sendgridFromEmailSaved: sendgridFromSaved,
    resendFromEmailSaved: resendFromSaved,
    sendgridOutboundFromConfigured,
    resendDefaultFromConfigured,
  };
}

export async function getSendGridSendContext(
  userId: string,
): Promise<{ apiKey: string; fromEmail: string } | null> {
  const row = await prisma.emailProviderIntegration.findUnique({ where: { userId } });
  const apiKey =
    tryDecrypt(row?.sendgridApiKeyEnc ?? null)?.trim() || getSendGridApiKey()?.trim() || null;
  const fromEmail =
    row?.sendgridFromEmail?.trim() || getSendGridDefaultFromEnv()?.trim() || null;
  if (!apiKey || !fromEmail) return null;
  return { apiKey, fromEmail };
}

export async function getResendSendContext(
  userId: string,
): Promise<{ apiKey: string; fromEmail: string } | null> {
  const row = await prisma.emailProviderIntegration.findUnique({ where: { userId } });
  const apiKey =
    tryDecrypt(row?.resendApiKeyEnc ?? null)?.trim() || getResendApiKey()?.trim() || null;
  const fromEmail =
    row?.resendFromEmail?.trim() || getResendDefaultFromEnv()?.trim() || null;
  if (!apiKey || !fromEmail) return null;
  return { apiKey, fromEmail };
}
