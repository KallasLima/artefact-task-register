import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  reporter: "list",
  outputDir: process.env.TEST_OUTPUT_DIR ?? "test-results",
  use: {
    baseURL: "http://127.0.0.1:3150",
    browserName: "chromium",
    launchOptions: { ignoreDefaultArgs: ["--disable-back-forward-cache"] },
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3150",
    url: "http://127.0.0.1:3150",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
