const { Redis } = require('@upstash/redis');
const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  try {
    // Fetch the latest 50 keys using Upstash
    const keys = await redis.lrange('generated_keys', 0, 50) || [];
    res.status(200).json(keys);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ error: "Could not fetch keys" });
  }
};

