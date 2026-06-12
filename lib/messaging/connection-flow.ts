export const messagingFlowConfig = {
  /** Email: users save their own SendGrid/Resend API keys (encrypted); optional server env fallback. */
  autoProvisionEmailOnWorkspaceCreate: false,
  steps: [
    "Create or open your Twilio account and go to the Twilio Console.",
    "Under Account → API keys & tokens, copy your Twilio Account SID and Auth Token.",
    "Paste them on this page to connect Twilio to SalesLay (we encrypt your Auth Token at rest).",
    "Link a messaging number from your Twilio account for SMS and RCS (or add one in Twilio first).",
  ],
  messages: {
    workspaceReadySmsFirst:
      "Messaging workspace is ready. Next, get your SMS number. Email can be set up later.",
    workspaceReadyEmailAndSms:
      "Messaging and email workspaces are ready. Next, get your SMS number.",
    emailNotConfigured:
      "Add your SendGrid or Resend API key on the Provider tab (saved encrypted for your account). Optionally set SENDGRID_API_KEY / RESEND_API_KEY on the server as a fallback.",
  },
} as const;

