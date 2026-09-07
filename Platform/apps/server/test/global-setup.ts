import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..");

export default async function globalSetup(): Promise<void> {
  const url =
    process.env.DATABASE_URL ??
    process.env.TEST_DATABASE_URL ??
    "postgresql://platform:platform_dev_password@localhost:5433/platform_test";

  // Apply migrations to the test database
  execSync("npx prisma migrate deploy --schema prisma/schema.prisma", {
    cwd: serverRoot,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
