const express = require('express');
const { kv } = require('@vercel/kv');

const app = express();
app.use(express.json());

// --- 1. THE WEBHOOK (SellAuth hits this) ---
app.post('/webhook', async (req, res) => {
  // Check your secret password (set in Vercel Environment Variables)
  const authHeader = req.headers['authorization'];
  if (authHeader !== process.env.SELLAUTH_SECRET) {
    return res.status(401).send('Unauthorized');
  }

  const orderData = req.body;

  try {
    // Generate the key (replace with your actual API fetch logic)
    const generatedKey = `KEY-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Log it to the database
    const logEntry = {
      orderId: orderData.order_id || 'Unknown',
      product: orderData.product_name || 'Dynamic Item',
      key: generatedKey,
      timestamp: new Date().toISOString()
    };
    await kv.lpush('generated_keys', logEntry);

    // Send the key back to SellAuth
    res.status(200).send(generatedKey);

  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Error generating key.");
  }
});


// --- 2. THE DASHBOARD (You visit this in your browser) ---
app.get('/', async (req, res) => {
  // Fetch the latest 50 keys from the database
  const keys = await kv.lrange('generated_keys', 0, 50) || [];

  // Build the table rows dynamically
  let tableRows = keys.map(entry => `
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 12px;">${new Date(entry.timestamp).toLocaleString()}</td>
      <td style="padding: 12px;">${entry.orderId}</td>
      <td style="padding: 12px;">${entry.product}</td>
      <td style="padding: 12px;"><code>${entry.key}</code></td>
    </tr>
  `).join('');

  // Send the HTML page
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Delivery Dashboard</title>
        <style>
          body { font-family: sans-serif; padding: 2rem; max-width: 900px; margin: 0 auto; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 1rem; text-align: left; }
          th { background: #f4f4f4; padding: 12px; }
          code { background: #eee; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>🔑 Delivery Dashboard</h1>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Order ID</th>
              <th>Product</th>
              <th>Key Delivered</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  res.send(html);
});

// IMPORTANT: Export the app instead of using app.listen() so Vercel can run it
module.exports = app;
