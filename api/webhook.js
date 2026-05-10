const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  // Only allow POST requests from SellAuth
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // Security check
  const authHeader = req.headers['authorization'];
  if (authHeader !== process.env.SELLAUTH_SECRET) {
    return res.status(401).send('Unauthorized');
  }

  const orderData = req.body || {};

  try {
    // Generate the key
    const generatedKey = `KEY-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Log it to the database
    const logEntry = {
      orderId: orderData.order_id || 'Unknown',
      product: orderData.product_name || 'Dynamic Item',
      key: generatedKey,
      timestamp: new Date().toISOString()
    };
    
    await kv.lpush('generated_keys', logEntry);

    // Return the key to SellAuth
    res.status(200).send(generatedKey);
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).send("Error generating key");
  }
};
