const { Redis } = require('@upstash/redis');
const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const authHeader = req.headers['authorization'];
  if (authHeader !== process.env.SELLAUTH_SECRET) {
    return res.status(401).send('Unauthorized');
  }

  const payload = req.body || {};
  const adminInvoiceId = payload.invoice_id || payload.id || payload.order_id;

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

    let finalOrderId = adminInvoiceId || "Unknown";
    let finalProduct = payload.product_name || "Dynamic Item";
    let finalQuantity = payload.quantity || 1;

    if (adminInvoiceId && process.env.SELLAUTH_API_KEY && process.env.SELLAUTH_SHOP_ID) {
      try {
        const apiUrl = `https://api.sellauth.com/v1/shops/${process.env.SELLAUTH_SHOP_ID}/invoices/${adminInvoiceId}`;
        const sellAuthRes = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.SELLAUTH_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        const realInvoice = await sellAuthRes.json();

        if (realInvoice && !realInvoice.error) {
           const invoiceData = realInvoice.data || realInvoice;
           
           finalOrderId = invoiceData.public_id || invoiceData.invoice_id || invoiceData.id || finalOrderId;
           finalQuantity = invoiceData.quantity || finalQuantity;
           
           if (invoiceData.product && invoiceData.product.title) {
               finalProduct = invoiceData.product.title;
           } else if (invoiceData.product_name) {
               finalProduct = invoiceData.product_name;
           }
        }
      } catch (apiError) {
        console.error("Failed to fetch from SellAuth API:", apiError);
      }
    }

    const logEntry = {
      orderId: finalOrderId,
      product: finalProduct,
      quantity: finalQuantity,
      key: generatedKey,
      timestamp: new Date().toISOString()
    };
    
    await redis.lpush('generated_keys', logEntry);
    await redis.set(`license:${generatedKey}`, logEntry);

    // --- DISCORD WEBHOOK LOGIC ---
    if (process.env.DISCORD_WEBHOOK_URL) {
      const discordEmbed = {
        username: "SellAuth Delivery System",
        embeds: [{
          title: "🛍️ New Order & Key Generated!",
          color: 3092790,
          fields: [
            { name: "📦 Product", value: `\`${finalProduct || 'Unknown'}\``, inline: true },
            { name: "🔢 Quantity", value: `\`${finalQuantity || '1'}\``, inline: true },
            { name: "🧾 Invoice ID", value: `\`${finalOrderId || 'Unknown'}\``, inline: true },
            { name: "🔑 Delivered Key", value: `\`\`\`${generatedKey || 'ERROR'}\`\`\``, inline: false }
          ],
          timestamp: new Date().toISOString()
        }]
      };

      try {
        const discordRes = await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordEmbed)
        });
        
        if (!discordRes.ok) {
           const errText = await discordRes.text();
           console.error(`DISCORD REJECTED IT: Status ${discordRes.status} - ${errText}`);
        } else {
           console.log("Discord Webhook sent successfully!");
        }
      } catch (discordErr) {
        console.error("Network error sending to Discord:", discordErr);
      }
    } else {
       console.log("No DISCORD_WEBHOOK_URL found in Vercel settings.");
    }

    res.status(200).send(generatedKey);
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).send("Error generating key");
  }
};
