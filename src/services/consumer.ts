import * as amqp from "amqplib";
import { ConsumeMessage, Channel } from "amqplib";
import { EmailMessagePayload } from "../utils/types";
import { EmailTemplateData } from "../utils/sendmail/make-template";
import { sendEmail } from "../utils/sendmail";

const RABBITMQ_URL = "amqp://localhost";
const EXCHANGE_NAME = "emailExchange";
const QUEUE_NAME = "emailQueue";
const ROUTING_KEY =
  "imdqKn26vi5SNAZI1l9PsePPMRGOcaWFHOFLG4wsXlkvryYMMU1VKKMD3LYjVnMYCwSmSMAK5ZNhCynfoIlBxgiGTf6XclsNPyBVGkWdLlDi6VGSgyGsfbAHqG8QL4da90dnC9x9kZQ4uUdKuKreWGWix9lelb9klVnW6IHMBHnsibHvkxKTsGE7vpoOh7wauuWdIIJOEwtaUoQOhnfAtOSPn7w7uyg3EJpXLl9oLqTLRvFktMIgad9nfonl8aX";

export const consumeMessage = async () => {
  console.log("🚀 Starting to consume messages...");

  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    console.log("📡 Connected to RabbitMQ");

    const channel: Channel = await connection.createChannel();
    console.log("📦 Channel created");

    await channel.assertExchange(EXCHANGE_NAME, "direct", { durable: true });
    console.log(`✅ Exchange '${EXCHANGE_NAME}' asserted`);

    const { queue } = await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`📥 Queue '${queue}' asserted`);

    await channel.bindQueue(queue, EXCHANGE_NAME, ROUTING_KEY);
    console.log(
      `🔗 Queue '${queue}' bound to exchange '${EXCHANGE_NAME}' with routing key '${ROUTING_KEY}'`
    );

    await channel.consume(queue, async (msg: ConsumeMessage | null) => {
      if (msg) {
        console.log("📨 Message received", msg);
        try {
          const data: EmailMessagePayload = JSON.parse(msg.content.toString());

          if (Array.isArray(data.message)) {
            let allSent = true;

            const extractedData = data.message.map(
              ({ email, name, batch, window }) => ({
                email,
                name,
                batch,
                window,
              })
            );

            for (const item of extractedData) {
              const mailData = { name: item.name };
              try {
                const message = EmailTemplateData(
                  "revotaxresume.html",
                  mailData
                );
                const subject = `Revotax`;
                const res = await sendEmail(item.email, message, subject);
                if (!res) allSent = false;
              } catch (error) {
                console.error("❌ Error sending email:", error);
                allSent = false;
              }
            }

            if (allSent) {
              const batch = data.batch;
              const window = data.window;

              const mailData = {
                name: "Anthony Umejiofor",
                batch: `${batch}`,
                count: `${window}`,
              };

              const message = EmailTemplateData("completed.html", mailData);
              const subject = `Eid Mubarak`;
              const email = "raphael.emehelu@appmartgroup.com";

              try {
                await sendEmail(email, message, subject);
              } catch (error) {
                console.error("❌ Error sending completion email:", error);
              }
            }
          } else {
            console.log(
              "⚠️ Invalid message format: 'message' should be an array"
            );
          }

          channel.ack(msg);
        } catch (err) {
          console.error("❌ Failed to process message:", err);
        }
      } else {
        console.log("⚠️ No message received");
      }
    });

    console.log("👂 Waiting for messages...");
  } catch (error) {
    console.error("❌ Error in consumeMessage:", error);
  }
};
