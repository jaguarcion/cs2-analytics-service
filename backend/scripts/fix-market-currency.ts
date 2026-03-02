import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating Market.CSGO trades currency to RUB...');
  
  const result = await prisma.$executeRaw`
    UPDATE trades
    SET currency = 'RUB'
    WHERE platform_source = 'MARKET_CSGO'
      AND currency IS NULL
  `;
  
  console.log(`Updated ${result} trades`);
  
  // Verify
  const count = await prisma.trade.count({
    where: {
      platformSource: 'MARKET_CSGO',
      currency: 'RUB',
    },
  });
  
  console.log(`Total Market.CSGO trades with RUB currency: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
