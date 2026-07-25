import { MESSAGES_COLLECTION, type MessageDocument } from "../../domain/contracts/message-document";
import type { NotificationStatusPayload } from "../../domain/contracts/notification-status-payload";
import { getMongoDb } from "../../infrastructure/database/mongo/client";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/// Atualiza o status de entrega da mensagem correspondente no Mongo. Uma
/// notificação de status pode, em teoria, chegar antes do documento da
/// mensagem ter sido gravado pelo Outbound-Worker (corrida com o webhook da
/// Meta) — uma única tentativa extra depois de uma pausa curta cobre esse
/// caso sem virar um sistema de retry com backoff.
export async function updateMessageStatus(payload: NotificationStatusPayload): Promise<void> {
  const db = await getMongoDb();
  const collection = db.collection<MessageDocument>(MESSAGES_COLLECTION);

  const filter = { externalMessageId: payload.externalMessageId };
  const update = { $set: { waStatus: payload.waStatus } };

  let result = await collection.updateOne(filter, update);

  if (result.matchedCount === 0) {
    await delay(1500);
    result = await collection.updateOne(filter, update);
  }

  if (result.matchedCount === 0) {
    console.warn(
      `Nenhuma mensagem encontrada para externalMessageId=${payload.externalMessageId} (status=${payload.waStatus}) — ignorando.`,
    );
  }
}
