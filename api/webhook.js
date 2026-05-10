const { Redis } = require('@upstash/redis');
const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // --- 1. SECURITY CHECK ---
  const urlSecret = req.query.secret;
  if (urlSecret !== process.env.SELLAUTH_SECRET) {
    console.error("Unauthorized request. Wrong or missing secret in URL.");
    return res.status(401).send('Unauthorized');
  }

  const payload = req.body || {};

  try {
    // --- 2. EXTRACT RICH DATA FROM SELLAUTH ---
    // Grabbing all the cool details from the massive payload you provided
    const finalOrderId = payload.unique_id || payload.invoice_id || "Unknown_ID";
    const finalQuantity = parseInt(payload.item?.quantity || payload.amount || 1);
    const finalProduct = payload.item?.product?.name || "Dynamic Item";
    const customerEmail = payload.email || "Unknown Buyer";
    const discordUser = payload.customer?.discord_username || "Not Provided";
    const gateway = payload.gateway || "Unknown";
    const totalPrice = `$${payload.item?.total_price_usd || payload.price_usd || "0.00"} USD`;
    const couponUsed = payload.coupon?.code || "None";

    // --- 3. GENERATE A SINGLE MASTER KEY ---
    const getChunk = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let chunk = '';
      for (let i = 0; i < 5; i++) chunk += chars.charAt(Math.floor(Math.random() * chars.length));
      return chunk;
    };
    // Only 1 key is generated, regardless of quantity!
    const generatedKey = `${getChunk()}-${getChunk()}-${getChunk()}`;

    // --- 4. SAVE TO UPSTASH DATABASE ---
    const logEntry = {
      orderId: finalOrderId,
      product: finalProduct,
      quantity: finalQuantity, // Logs the real amount they bought
      email: customerEmail,
      discord: discordUser,
      price: totalPrice,
      key: generatedKey,
      timestamp: new Date().toISOString()
    };
    
    await redis.lpush('generated_keys', logEntry);
    await redis.set(`license:${generatedKey}`, logEntry);

    // --- 5. ENHANCED DISCORD WEBHOOK UI ---
    if (process.env.DISCORD_WEBHOOK_URL) {
      const discordPayload = {
        username: "SellAuth Delivery System",
        embeds: [{
          title: "🎉 New Order & Key Generated!",
          color: 5763719, // A vibrant, clean green
          description: `Successfully processed an order and secured **1** master license key for a quantity of **${finalQuantity}**.`,
          fields: [
            { name: "📦 Product", value: `\`${finalProduct}\``, inline: true },
            { name: "🔢 Quantity", value: `\`${finalQuantity}\``, inline: true },
            { name: "💵 Total Paid", value: `\`${totalPrice}\``, inline: true },
            { name: "👤 Buyer Email", value: `\`${customerEmail}\``, inline: true },
            { name: "👾 Discord", value: `\`${discordUser}\``, inline: true },
            { name: "💳 Payment Method", value: `\`${gateway}\``, inline: true },
            { name: "🏷️ Coupon Used", value: `\`${couponUsed}\``, inline: true },
            { name: "🧾 Invoice ID", value: `\`${finalOrderId}\``, inline: true },
            // Uses a 'fix' codeblock to highlight the key in yellow text in Discord
            { name: "🔑 Delivered Key", value: `\`\`\`fix\n${generatedKey}\n\`\`\``, inline: false }
          ],
          footer: { text: "SellAuth Security & Database System" },
          timestamp: new Date().toISOString()
        }],
        components: [
          {
            type: 1, // ActionRow
            components: [
              {
                type: 2, // Button
                style: 5, // Link Button
                label: "🧾 View Full Invoice",
                url: `https://checkout.sellauth.com/invoice/${finalOrderId}` 
              }
            ]
          }
        ]
      };

      try {
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordPayload)
        });
      } catch (discordErr) {
        console.error("Network error sending to Discord:", discordErr);
      }
    }

    // --- 6. DELIVER THE KEY TO SELLAUTH ---
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(generatedKey);

  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).send("Error generating key");
  }
};
