import { execSync } from 'node:child_process';

// Runs once before all tests: brings the test database up to date with the migrations.
// The tests use `local_heroes_test`, never your development database.
export default function setup() {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DB_NAME: 'local_heroes_test' },
    stdio: 'pipe',
  });
}
