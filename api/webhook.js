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
    const getChunk = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let chunk = '';
      for (let i = 0; i < 5; i++) {
        chunk += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return chunk;
    };
    const generatedKey = `${getChunk()}-${getChunk()}-${getChunk()}`;

    // Capture everything
    const exactOrderId = orderData.invoice_id || orderData.id || orderData.order_id || orderData.uniqid || 'Unknown';
    const exactProduct = orderData.product_name || orderData.product || orderData.title || 'Dynamic Item';
    const exactQuantity = orderData.quantity || orderData.qty || 1;

    const logEntry = {
      orderId: exactOrderId,
      product: exactProduct,
      quantity: exactQuantity,
      key: generatedKey,
      timestamp: new Date().toISOString()
    };
    
    // 1. Push to the list (For your HTML Dashboard)
    await redis.lpush('generated_keys', logEntry);

    // 2. Save a direct reference (For your Discord Bot to fetch instantly)
    await redis.set(`license:${generatedKey}`, logEntry);

    res.status(200).send(generatedKey);
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).send("Error generating key");
  }
};
