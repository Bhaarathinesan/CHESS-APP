require('dotenv').config();
const { execSync } = require('child_process');

try {
  console.log('Running Prisma db push...');
  execSync('npx prisma db push --schema ./prisma/schema.prisma', {
    stdio: 'inherit',
    cwd: __dirname,
    env: process.env
  });
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}
