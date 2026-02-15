
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  console.log('--- Environment Check ---');
  console.log('MARKET_CSGO_BASE_URL:', process.env.MARKET_CSGO_BASE_URL);
  console.log('MARKET_CSGO_API_KEY:', process.env.MARKET_CSGO_API_KEY ? '***Present***' : 'MISSING');

  const apiKey = process.env.MARKET_CSGO_API_KEY;
  const baseUrl = process.env.MARKET_CSGO_BASE_URL || 'https://market.csgo.com';

  console.log('\n--- API Connectivity Check ---');
  try {
    console.log(`GET ${baseUrl}/api/v2/items?key=***`);
    const res = await axios.get(`${baseUrl}/api/v2/items`, {
      params: { key: apiKey },
      timeout: 10000
    });
    
    if (res.data && res.data.success) {
      console.log('SUCCESS: Market.CSGO API returned success: true');
      const items = res.data.items || [];
      console.log(`Items count in response: ${items.length}`);
      if (items.length > 0) {
        console.log('First item sample:', JSON.stringify(items[0], null, 2));
      }
    } else {
      console.log('FAILURE: Market.CSGO API returned success: false');
      console.log('Response:', JSON.stringify(res.data, null, 2));
    }
  } catch (error) {
    console.error('ERROR: API Request failed');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
  }

  console.log('\n--- Database Check ---');
  try {
      const count = await prisma.item.count({ where: { platformSource: 'MARKET_CSGO' } });
      console.log(`Total Market.CSGO items in DB: ${count}`);
      
      const missingFloat = await prisma.item.count({ 
          where: { 
              platformSource: 'MARKET_CSGO', 
              floatValue: null,
              assetId: { not: null },
              classId: { not: null }
          } 
      });
      console.log(`Items with missing float (and present IDs): ${missingFloat}`);
  } catch(e) {
      console.error('DB Error:', e.message);
  } finally {
      await prisma.$disconnect();
  }
}

main();
