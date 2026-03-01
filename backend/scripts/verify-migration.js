const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyMigration() {
  console.log('🔍 Verifying database migration...\n');

  try {
    // Check if we can connect to the database
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Query to get all tables
    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    console.log(`\n📊 Found ${tables.length} tables:`);
    tables.forEach((table) => {
      console.log(`   - ${table.tablename}`);
    });

    // Query to get all indexes
    const indexes = await prisma.$queryRaw`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY indexname;
    `;

    console.log(`\n📇 Found ${indexes.length} indexes`);

    // Query to get all foreign key constraints
    const foreignKeys = await prisma.$queryRaw`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE constraint_type = 'FOREIGN KEY' 
        AND table_schema = 'public'
      ORDER BY constraint_name;
    `;

    console.log(`\n🔗 Found ${foreignKeys.length} foreign key constraints`);

    // Query to get all enums
    const enums = await prisma.$queryRaw`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e'
      ORDER BY typname;
    `;

    console.log(`\n📋 Found ${enums.length} enum types:`);
    enums.forEach((enumType) => {
      console.log(`   - ${enumType.typname}`);
    });

    console.log('\n✅ Migration verification complete!');
    console.log('\n📝 Summary:');
    console.log(`   - Tables: ${tables.length}`);
    console.log(`   - Indexes: ${indexes.length}`);
    console.log(`   - Foreign Keys: ${foreignKeys.length}`);
    console.log(`   - Enums: ${enums.length}`);
  } catch (error) {
    console.error('❌ Error verifying migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigration();
