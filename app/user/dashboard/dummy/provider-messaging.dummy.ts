import type { ProviderWorkspacePayload } from "@/app/user/dashboard/connection/_components/provider-email-card";

export const dummyProviderWorkspace: ProviderWorkspacePayload = {
  state: "ready",
  email: "ready",
  twilio: { source: "user", accountSidPreview: "AC••••7f2a" },
  sendgridConfigured: true,
  sendgridInboundAddress: "parse@saleslay.example",
  sendgridInboundDomainSaved: "saleslay.example",
  sendgridInboundLocalPart: "sl-inbound",
  sendgridOutboundFromConfigured: true,
  sendgridUserKeySaved: true,
  sendgridFromEmailSaved: "hello@agency.example",
  emailDeliveryProvider: "SENDGRID",
  effectiveEmailDeliveryProvider: "SENDGRID",
  needsEmailProviderChoice: false,
  resendConfigured: false,
  resendDefaultFromConfigured: false,
  resendUserKeySaved: false,
  resendFromEmailSaved: null,
};

export const dummySmsNumberStatus = {
  state: "ready" as const,
  phoneNumber: "+1 (555) 014-8821",
};
