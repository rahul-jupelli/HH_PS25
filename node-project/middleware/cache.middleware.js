import redis from "../config/redis.js";

export function cache(keyPrefix) {
  return async (req, res, next) => {
    const key = keyPrefix + ":" + JSON.stringify({
      params: req.params,
      query: req.query,
    });

    try {
      // Check cache
      const cached = await redis.get(key);
      if (cached) {
        console.log("⚡ Redis Cache Hit:", key);
        return res.json(JSON.parse(cached));
      }

      console.log("⏳ Redis Cache Miss:", key);

      // Override res.json to cache the response after sending it
      const originalJson = res.json.bind(res);

      res.json = async (body) => {
        try {
          // ioredis uses `set` with options (no setEx)
          await redis.set(key, JSON.stringify(body), "EX", 3600); // TTL = 1 hour
        } catch (err) {
          console.error("Redis write error:", err);
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error("Redis Middleware Error:", error);
      next(); // continue even if Redis fails
    }
  };
}
