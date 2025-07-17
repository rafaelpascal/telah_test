import * as amqp from "amqplib";

interface LogDetails {
  logType: string;
  message: any;
  batch: string;
  window: string;
  dateTime: Date;
  html: string;
  completedhtml: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}
export class Producer {
  private channel: amqp.Channel | undefined;
  private readonly EXCHANGE_NAME = "emailExchange";
  private readonly EXCHANGE_TYPE = "direct";
  private readonly RABBITMQ_URL = "amqp://localhost";

  private async createChannel(): Promise<void> {
    try {
      const connection = await amqp.connect(this.RABBITMQ_URL);
      this.channel = await connection.createChannel();

      await this.channel.assertExchange(
        this.EXCHANGE_NAME,
        this.EXCHANGE_TYPE,
        {
          durable: true,
        }
      );
    } catch (error) {
      console.error("❌ RabbitMQ Channel Creation Error:", error);
    }
  }

  public async publishMessage(
    routingKey: string,
    message: any,
    batch: string,
    window: string,
    html: string,
    completedhtml: string,
    user?: {
      id: string;
      name: string;
      email: string;
    }
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
      html,
      user,
      completedhtml,
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
