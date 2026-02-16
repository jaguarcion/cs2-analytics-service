
const axios = require('axios');

async function debugCsfloat() {
  const apiKey = process.env.CSFLOAT_API_KEY;
  if (!apiKey) {
    console.error('CSFLOAT_API_KEY is missing in .env');
    return;
  }

  // Create axios instance
  const client = axios.create({
    baseURL: 'https://csfloat.com/api/v1',
    headers: { Authorization: apiKey },
  });

  console.log('Fetching active listings from /me/listings...');

  try {
    const res = await client.get('/me/listings');
    const items = res.data;

    console.log(`Got ${items.length} items.`);

    // Find the specific item (USP-S Cyrex or Karambit)
    const targetItem = items.find((i) => 
      (i.item.market_hash_name && (i.item.market_hash_name.includes('Karambit') || i.item.market_hash_name.includes('USP-S')))
    );

    if (targetItem) {
      console.log('Found target item:', targetItem.item.market_hash_name);
      console.log('State:', targetItem.state);
      console.log('Full JSON:', JSON.stringify(targetItem, null, 2));
    } else {
      console.log('Target item not found. First item structure:');
      if (items.length > 0) console.log(JSON.stringify(items[0], null, 2));
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

debugCsfloat();
