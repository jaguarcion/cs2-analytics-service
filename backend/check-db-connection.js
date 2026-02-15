
const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('Starting DB connection check...');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('Successfully connected to the database.');
    
    // Check if we can query items
    const count = await prisma.item.count();
    console.log(`Item count: ${count}`);
    
    // Check for new columns
    try {
        const item = await prisma.item.findFirst({
            select: { classId: true, instanceId: true }
        });
        console.log('Schema check passed: classId and instanceId are queryable.');
    } catch (e) {
        console.error('Schema check failed! The database might not be migrated.', e.message);
    }

  } catch (e) {
    console.error('Fatal: Could not connect to database:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
