import type { Channel, ConsumeMessage } from "amqplib";
import { updateMessageStatus } from "../../application/use-cases/update-message-status";
import type { NotificationStatusPayload } from "../../domain/contracts/notification-status-payload";
import { assertQueueWithDlq } from "../../infrastructure/queue/rabbitmq/connection";
import { QUEUE_NOTIFICATION_STATUS_PROCESS } from "../../infrastructure/queue/rabbitmq/queues";

export async function startNotificationStatusConsumer(channel: Channel): Promise<void> {
  await assertQueueWithDlq(channel, QUEUE_NOTIFICATION_STATUS_PROCESS);
  channel.prefetch(10);

  channel.consume(QUEUE_NOTIFICATION_STATUS_PROCESS, (msg) => onMessage(channel, msg));

  console.log(`Aguardando mensagens na fila ${QUEUE_NOTIFICATION_STATUS_PROCESS}`);
}

async function onMessage(channel: Channel, msg: ConsumeMessage | null): Promise<void> {
  if (!msg) return;

  try {
    const payload = JSON.parse(msg.content.toString()) as NotificationStatusPayload;
    await updateMessageStatus(payload);
    channel.ack(msg);
  } catch (error) {
    console.error("Erro ao processar notification.status.process:", error);
    channel.nack(msg, false, false);
  }
}
