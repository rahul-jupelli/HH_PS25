import dotenv from "dotenv";
import Redis from "ioredis";

dotenv.config();

// Determine Redis connection for both Docker & local development
const host = process.env.REDIS_HOST || "localhost";
const port = process.env.REDIS_PORT || 6379;

const redisUrl = `redis://${host}:${port}`;

const redis = new Redis(redisUrl);

redis.on("connect", () => console.log(`Redis connected → ${redisUrl}`));
redis.on("error", err => console.error("Redis Error:", err));

export default redis;

