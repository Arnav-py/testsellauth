const { Redis } = require('@upstash/redis');
const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const authHeader = req.headers['authorization'];
  if (authHeader !== process.env.SELLAUTH_SECRET) {
    return res.status(401).send('Unauthorized');
  }

  const orderData = req.body || {};

  try {
    const generatedKey = `KEY-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const logEntry = {
      orderId: orderData.order_id || 'Unknown',
      product: orderData.product_name || 'Dynamic Item',
      key: generatedKey,
      timestamp: new Date().toISOString()
    };
    
    // Using Upstash redis to push the data
    await redis.lpush('generated_keys', logEntry);

    res.status(200).send(generatedKey);
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).send("Error generating key");
  }
};
