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
    // --- NEW KEY GENERATION LOGIC ---
    // Generates a 5-character string of random uppercase letters and numbers
    const getChunk = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let chunk = '';
      for (let i = 0; i < 5; i++) {
        chunk += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return chunk;
    };

    // Combines 3 chunks together with dashes (e.g., IHDUD-IQIHD-OQUHD)
    const generatedKey = `${getChunk()}-${getChunk()}-${getChunk()}`;
    // --------------------------------

    const logEntry = {
      orderId: orderData.order_id || 'Unknown',
      product: orderData.product_name || 'Dynamic Item',
      key: generatedKey,
      timestamp: new Date().toISOString()
    };
    
    await redis.lpush('generated_keys', logEntry);

    res.status(200).send(generatedKey);
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).send("Error generating key");
  }
};
