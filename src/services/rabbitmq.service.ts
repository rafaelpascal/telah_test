import * as amqp from "amqplib";
import { Channel } from "amqplib";
import { RABBITMQ_URL } from "../config/rabbitmq.config";

let channel: Channel;

export const connectRabbitMQ = async (): Promise<Channel> => {
  const connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();
  return channel;
};

export const getChannel = (): Channel => {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }
  return channel;
};
