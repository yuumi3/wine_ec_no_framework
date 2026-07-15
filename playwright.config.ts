import { defineConfig, devices } from "@playwright/test";

// E2E 用のポートと隔離DB。開発用DB(data/wine_ec.db)とは別ファイルを使う。
const PORT = 3210;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  // フロントをビルドし、隔離DBをリセット・シードしてからサーバを起動する。
  webServer: {
    command: "npm run e2e:server",
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PORT: String(PORT),
      WINE_EC_DB: "data/e2e.db",
    },
  },
});
