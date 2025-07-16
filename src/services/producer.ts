import * as amqp from "amqplib";

interface LogDetails {
  logType: string;
  message: any; // ideally define a stricter type
  batch: string;
  window: string;
  dateTime: Date;
}
console.log("💬 [Producer] publishMessage called");
export class Producer {
  private channel: amqp.Channel | undefined;
  private readonly EXCHANGE_NAME = "emailExchange";
  private readonly EXCHANGE_TYPE = "direct";
  private readonly RABBITMQ_URL = "amqp://localhost";

  private async createChannel(): Promise<void> {
    try {
      const connection = await amqp.connect(this.RABBITMQ_URL);
      console.log("📡 Connected to RabbitMQ");
      this.channel = await connection.createChannel();
      console.log("🔄 Channel created");

      await this.channel.assertExchange(
        this.EXCHANGE_NAME,
        this.EXCHANGE_TYPE,
        {
          durable: true,
        }
      );
      console.log(`✅ Exchange '${this.EXCHANGE_NAME}' asserted`);
    } catch (error) {
      console.error("❌ RabbitMQ Channel Creation Error:", error);
    }
  }

  public async publishMessage(
    routingKey: string,
    message: any, // you can replace `any` with a specific message type
    batch: string,
    window: string
  ): Promise<void> {
    if (!this.channel) {
      await this.createChannel();
    }

    // Ensure exchange is declared (even if channel exists)
    await this.channel!.assertExchange(this.EXCHANGE_NAME, this.EXCHANGE_TYPE, {
      durable: true,
    });

    const logDetails: LogDetails = {
      logType: routingKey,
      message,
      batch,
      window,
      dateTime: new Date(),
    };

    const payload = Buffer.from(JSON.stringify(logDetails));

    const published = this.channel!.publish(
      this.EXCHANGE_NAME,
      routingKey,
      payload
    );

    if (!published) {
      console.error("⚠️ Failed to publish message to RabbitMQ");
    }

    console.log(
      `📤 The message ${JSON.stringify(message)} is sent to exchange '${
        this.EXCHANGE_NAME
      }' with routing key '${routingKey}'`
    );
  }
}
