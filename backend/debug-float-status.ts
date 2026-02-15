
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const totalNullFloat = await prisma.item.count({ 
        where: { 
            platformSource: 'MARKET_CSGO', 
            floatValue: null 
        } 
    });
    
    const nullFloatAndNullIds = await prisma.item.count({ 
        where: { 
            platformSource: 'MARKET_CSGO', 
            floatValue: null,
            OR: [
                { classId: null },
                { assetId: null }
            ]
        } 
    });

    const fixableItems = await prisma.item.count({ 
        where: { 
            platformSource: 'MARKET_CSGO', 
            floatValue: null,
            classId: { not: null },
            assetId: { not: null }
        } 
    });

    console.log(`Total items with NULL float: ${totalNullFloat}`);
    console.log(`Items with NULL float AND missing IDs (unfixable): ${nullFloatAndNullIds}`);
    console.log(`Items with NULL float AND present IDs (fixable): ${fixableItems}`);

    if (fixableItems > 0) {
        const sample = await prisma.item.findFirst({
            where: { 
                platformSource: 'MARKET_CSGO', 
                floatValue: null,
                classId: { not: null },
                assetId: { not: null }
            }
        });
        console.log('Sample fixable item:', JSON.stringify(sample, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
