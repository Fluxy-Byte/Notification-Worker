export interface NotificationStatusPayload {
  whatsappChannelId: string;
  externalMessageId: string;
  waStatus: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
}
