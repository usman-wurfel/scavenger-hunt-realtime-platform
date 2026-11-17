import { DEFAULT_MESSAGE_COLOR } from "@/lib/alert-types";

export type ProximityAlertTemplate = {
  id: string;
  distanceFt: number;
  message: string;
  messageColor: string;
};

export function serializeProximityAlertTemplate(alertType: {
  id: string;
  distanceFt: number;
  message: string;
  messageColor: string;
}): ProximityAlertTemplate {
  return {
    id: alertType.id,
    distanceFt: alertType.distanceFt,
    message: alertType.message,
    messageColor: alertType.messageColor || DEFAULT_MESSAGE_COLOR,
  };
}
