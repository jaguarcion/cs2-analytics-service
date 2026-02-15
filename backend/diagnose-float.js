
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  console.log('--- Float Fetch Diagnostic ---');
  console.log('CSFLOAT_API_KEY:', process.env.CSFLOAT_API_KEY ? '***Present***' : 'MISSING');

  try {
      // 1. Get a sample item
      const item = await prisma.item.findFirst({ 
          where: { 
              platformSource: 'MARKET_CSGO', 
              floatValue: null,
              assetId: { not: null },
              classId: { not: null }
          } 
      });

      if (!item) {
          console.log('No items found with missing float and present IDs.');
          return;
      }

      console.log('Found item:', {
          name: item.name,
          assetId: item.assetId,
          classId: item.classId,
          instanceId: item.instanceId
      });

      // 2. Build Inspect URL
      const inspectUrl = `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M${item.classId}A${item.assetId}D${item.instanceId || '0'}`;
      console.log('Inspect URL:', inspectUrl);

      // 3. Try CSFloat
      if (process.env.CSFLOAT_API_KEY) {
          console.log('\nTrying CSFloat API...');
          try {
              const res = await axios.get(`https://csfloat.com/api/v1/inspect`, {
                  params: { url: inspectUrl },
                  timeout: 10000,
                  headers: { Authorization: `Bearer ${process.env.CSFLOAT_API_KEY}` },
              });
              console.log('CSFloat Response Status:', res.status);
              console.log('CSFloat Data:', JSON.stringify(res.data, null, 2));
          } catch (e) {
              console.error('CSFloat Error:', e.message);
              if (e.response) console.error('CSFloat Response:', JSON.stringify(e.response.data, null, 2));
          }
      } else {
          console.log('Skipping CSFloat (No Key)');
      }

      // 4. Try CSGOFloat (Public)
      console.log('\nTrying CSGOFloat (Public) API...');
      try {
          const res = await axios.get('https://api.csgofloat.com/', {
              params: { url: inspectUrl },
              timeout: 10000,
          });
          console.log('CSGOFloat Response Status:', res.status);
          console.log('CSGOFloat Data:', JSON.stringify(res.data, null, 2));
      } catch (e) {
          console.error('CSGOFloat Error:', e.message);
          if (e.response) console.error('CSGOFloat Response:', JSON.stringify(e.response.data, null, 2));
      }

  } catch(e) {
      console.error('Script Error:', e);
  } finally {
      await prisma.$disconnect();
  }
}

main();
