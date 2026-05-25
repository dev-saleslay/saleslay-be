export type {
  EmailDeliveryProviderId,
  EmailDeliveryResolution,
} from "@/lib/messaging/user-email-credentials";
export {
  getEmailDeliveryResolution,
  getResendSendContext,
  getSendGridSendContext,
  resolveEffectiveEmailDeliveryProvider,
} from "@/lib/messaging/user-email-credentials";
