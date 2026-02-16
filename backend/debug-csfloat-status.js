
const axios = require('axios');

async function debugCsfloat() {
  const apiKey = process.env.CSFLOAT_API_KEY;
  if (!apiKey) {
    console.error('CSFLOAT_API_KEY is missing in .env');
    return;
  }

  const client = axios.create({
    baseURL: 'https://csfloat.com/api/v1',
    headers: { Authorization: apiKey },
  });

  console.log('--- Debugging CSFloat API ---');

  // 1. Try /me to check auth and get steam_id
  try {
    console.log('1. Fetching /me ...');
    const meRes = await client.get('/me');
    console.log('User:', meRes.data.username, meRes.data.steam_id);
    
    // If we have steam_id, try fetching listings by steam_id
    if (meRes.data.steam_id) {
        console.log(`2. Fetching /listings?user_id=${meRes.data.steam_id} ...`);
        const listRes = await client.get('/listings', { 
            params: { user_id: meRes.data.steam_id, limit: 50 } 
        });
        const items = listRes.data;
        console.log(`Got ${items.length} items.`);
        
        // Check items
        checkItems(items);
    }
  } catch (e) {
    console.log('/me failed:', e.response?.status);
  }

  // 2. Try /me/stall (used in service)
  try {
    console.log('3. Fetching /me/stall ...');
    const stallRes = await client.get('/me/stall');
    const items = stallRes.data;
    console.log(`Got ${items.length} items from stall.`);
    checkItems(items);
  } catch (e) {
    console.log('/me/stall failed:', e.response?.status);
  }
  
  // 3. Try /me/trades (to see sales)
  try {
    console.log('4. Fetching /me/trades ...');
    const tradesRes = await client.get('/me/trades', { params: { limit: 20 } });
    const trades = tradesRes.data.trades || tradesRes.data; // structure varies
    console.log(`Got ${trades.length} trades.`);
    
    // Check if we find the item here
    const target = trades.find(t => {
        const name = t.contract?.item?.market_hash_name || t.item?.market_hash_name || '';
        return name.includes('USP-S') || name.includes('Cyrex');
    });
    
    if (target) {
        console.log('FOUND TARGET IN TRADES!');
        console.log(JSON.stringify(target, null, 2));
    }
  } catch (e) {
    console.log('/me/trades failed:', e.response?.status);
  }
}

function checkItems(items) {
    if (!Array.isArray(items)) return;
    const targetItem = items.find((i) => 
      (i.item.market_hash_name && (i.item.market_hash_name.includes('USP-S') || i.item.market_hash_name.includes('Cyrex')))
    );

    if (targetItem) {
      console.log('FOUND TARGET IN LISTINGS!');
      console.log('State:', targetItem.state);
      console.log('Full JSON:', JSON.stringify(targetItem, null, 2));
    }
}

debugCsfloat();
