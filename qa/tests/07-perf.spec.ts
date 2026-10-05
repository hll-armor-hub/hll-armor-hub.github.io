import { test, expect } from "./fixtures";

const BYTES_BUDGET = 2.5 * 1024 * 1024;
const LCP_BUDGET_MS = 2500;

test("7. perf: hub cold load on phone (cache disabled)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone", "perf is measured on the phone project only");

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });

    const reqs = new Map<string, { url: string; type: string; bytes: number; status?: number }>();
    cdp.on("Network.requestWillBeSent", (e: any) => {
        reqs.set(e.requestId, { url: e.request.url, type: e.type || "", bytes: 0 });
    });
    cdp.on("Network.responseReceived", (e: any) => {
        const r = reqs.get(e.requestId);
        if (r) r.status = e.response.status;
    });
    cdp.on("Network.loadingFinished", (e: any) => {
        const r = reqs.get(e.requestId);
        if (r) r.bytes = e.encodedDataLength;
    });

    await page.addInitScript(() => {
        (window as any).__lcp = 0;
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) (window as any).__lcp = entry.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
    });

    await page.goto("/", { waitUntil: "load" });
    await page.waitForURL(/#\/community$/);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const lcp = await page.evaluate(() => (window as any).__lcp as number);

    const list = [...reqs.values()].filter((r) => !r.url.startsWith("data:"));
    const total = list.reduce((s, r) => s + r.bytes, 0);
    const top = [...list].sort((a, b) => b.bytes - a.bytes).slice(0, 5);
    const kb = (b: number) => (b / 1024).toFixed(1) + " KB";
    const flags: string[] = [];
    if (total > BYTES_BUDGET) flags.push(`transfer ${kb(total)} > 2.5 MB`);
    if (lcp > LCP_BUDGET_MS) flags.push(`LCP ${Math.round(lcp)} ms > 2500 ms`);

    const summary = [
        "PERF SUMMARY (phone, hub, cache disabled)",
        `  requests:    ${list.length}`,
        `  transferred: ${kb(total)} (${(total / 1024 / 1024).toFixed(2)} MB)`,
        `  LCP:         ${Math.round(lcp)} ms`,
        "  top 5 resources:",
        ...top.map((r, i) => `    ${i + 1}. ${kb(r.bytes).padStart(10)}  ${r.type.padEnd(10)} ${r.url}`),
        `  flags:       ${flags.length ? flags.join("; ") : "none"}`
    ].join("\n");
    console.log(summary);
    await testInfo.attach("perf-summary.txt", { body: summary, contentType: "text/plain" });
    testInfo.annotations.push({ type: "perf", description: `${list.length} req · ${kb(total)} · LCP ${Math.round(lcp)} ms` });
    for (const f of flags) testInfo.annotations.push({ type: "perf-warning", description: f });

    expect(list.length).toBeGreaterThan(0);
});
