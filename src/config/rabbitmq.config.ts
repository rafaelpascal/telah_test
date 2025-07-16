import dotenv from "dotenv";
dotenv.config();

export const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
export const EMAIL_QUEUE = "email_queue";
