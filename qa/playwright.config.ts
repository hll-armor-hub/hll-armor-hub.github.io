import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.QA_BASE_URL || "http://localhost:8123";

/* Every project runs on the installed Microsoft Edge (Chromium), so no browser download is needed. */
const edge = { browserName: "chromium" as const, channel: "msedge" };

export default defineConfig({
    testDir: "./tests",
    timeout: 120_000,
    expect: { timeout: 15_000 },
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [["list"], ["html", { open: "never" }]],
    use: {
        baseURL: BASE_URL,
        permissions: ["clipboard-read", "clipboard-write"],
        screenshot: "only-on-failure",
        trace: "retain-on-failure",
        actionTimeout: 15_000,
        navigationTimeout: 30_000
    },
    projects: [
        {
            name: "phone",
            use: {
                ...devices["iPhone 13"],
                ...edge,
                viewport: { width: 390, height: 844 },
                isMobile: true,
                hasTouch: true
            }
        },
        {
            name: "small",
            use: {
                ...edge,
                viewport: { width: 360, height: 780 },
                deviceScaleFactor: 2,
                isMobile: true,
                hasTouch: true,
                userAgent: devices["Pixel 5"].userAgent
            }
        },
        {
            name: "desktop",
            use: {
                ...edge,
                viewport: { width: 1280, height: 800 }
            }
        }
    ]
});
