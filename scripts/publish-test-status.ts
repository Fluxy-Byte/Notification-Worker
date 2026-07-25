import amqplib from "amqplib";
import { env } from "../src/config/env";

async function main() {
  const externalMessageId = process.argv[2];
  if (!externalMessageId) {
    console.error("uso: ts-node scripts/publish-test-status.ts <externalMessageId>");
    process.exit(1);
  }

  const connection = await amqplib.connect(env.RABBITMQ_URL);
  const channel = await connection.createChannel();

  const payload = {
    whatsappChannelId: "test-wc-outbound-1",
    externalMessageId,
    waStatus: "delivered",
    timestamp: new Date().toISOString(),
  };

  channel.sendToQueue("notification.status.process", Buffer.from(JSON.stringify(payload)), { persistent: true });
  console.log("published:", JSON.stringify(payload));

  await channel.close();
  await connection.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
