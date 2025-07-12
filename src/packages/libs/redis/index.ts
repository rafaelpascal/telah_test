import Redis from "ioredis";

const redis = new Redis(
  "rediss://default:Aca2AAIjcDFiMmQ2OTUxZDlmYWU0Y2ZhODcyNzdhZmYzN2YxNTAxNXAxMA@cunning-woodcock-50870.upstash.io:6379"
);

export default redis;
