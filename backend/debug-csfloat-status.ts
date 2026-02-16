
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

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

  console.log('Fetching active listings from /me/listings...');

  try {
    // 1. Fetch listings to find the "USP-S | Cyrex"
    const res = await client.get('/me/listings');
    const items = res.data; // usually array

    console.log(`Got ${items.length} items.`);

    // Find the specific item (USP-S Cyrex)
    // Looking for one that might be "sold" but listed as "listed"
    const targetItem = items.find((i: any) => 
      i.item.market_hash_name.includes('Karambit | Damascus Steel') || 
      i.item.market_hash_name.includes('USP-S | Cyrex')
    );

    if (targetItem) {
      console.log('Found target item:', targetItem.item.market_hash_name);
      console.log('State:', targetItem.state);
      console.log('Full JSON:', JSON.stringify(targetItem, null, 2));
    } else {
      console.log('Target item not found in /me/listings. Printing first 3 items to check structure:');
      console.log(JSON.stringify(items.slice(0, 3), null, 2));
    }

  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugCsfloat();
