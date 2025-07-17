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
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel: Channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, "direct", { durable: true });
    const { queue } = await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.bindQueue(queue, EXCHANGE_NAME, ROUTING_KEY);
    await channel.consume(queue, async (msg: ConsumeMessage | null) => {
      if (msg) {
        try {
          const data: EmailMessagePayload = JSON.parse(msg.content.toString());
          const htmlTemplate = data.html;
          const completedHtmlTemplate = data.completedhtml;
          if (!htmlTemplate || typeof htmlTemplate !== "string") {
            console.error("❌ Invalid or missing HTML template in message!");
            channel.ack(msg);
            return;
          }
          if (
            !completedHtmlTemplate ||
            typeof completedHtmlTemplate !== "string"
          ) {
            console.error(
              "❌ Invalid or missing completed HTML template in message!"
            );
            channel.ack(msg);
            return;
          }
          if (Array.isArray(data.message)) {
            let allSent = true;

            const newbatch = data.batch;
            const newwindow = data.window;
            const user_name = data.user.name;
            const user_email = data.user.email;

            const extractedData = data.message.map(({ email, name }) => ({
              email,
              name,
              batch: newbatch,
              window: newwindow,
            }));

            for (const item of extractedData) {
              const mailData = { name: item.name };
              try {
                const message = EmailTemplateData(htmlTemplate, mailData);
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
                name: user_name,
                batch: `${batch}`,
                count: `${window}`,
              };

              const message = EmailTemplateData(
                completedHtmlTemplate,
                mailData
              );
              const subject = `Completion Notification`;
              const email = user_email;

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
  } catch (error) {
    console.error("❌ Error in consumeMessage:", error);
  }
};
