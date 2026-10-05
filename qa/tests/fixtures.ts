import fs from "node:fs";
import { test as base, expect, type Page, type Locator, type TestInfo } from "@playwright/test";

/* Third-party noise we don't own (YouTube embeds, Cloudflare beacon/RUM, ad + font hosts). */
const BENIGN = [
    /youtube(-nocookie)?\.com/i, /ytimg\.com/i, /googlevideo\.com/i, /\bwww\.google\.com\b/i,
    /doubleclick\.net/i, /googlesyndication\.com/i, /googletagmanager\.com/i, /google-analytics\.com/i,
    /cloudflareinsights\.com/i, /\/cdn-cgi\//i, /fonts\.(googleapis|gstatic)\.com/i,
    /Permissions-Policy/i, /Unrecognized feature/i
];

/* All match data comes from the stats Worker. Any browser request to bifroststats.com (JSON, live feed,
   anything) can trip Bifrost's Cloudflare rules and block this IP for hours, so it is aborted and fails the
   test. Plain <a href> links to bifroststats.com are fine because tests never follow them. */
const BIFROST_ANY = /^https?:\/\/([^/]*\.)?bifroststats\.com(\/|$)/i;

/* Optional: point the site at a local stats Worker, e.g. QA_STATS_API=http://127.0.0.1:8787 (localhost only). */
const STATS_API = process.env.QA_STATS_API || "";

export type Problem = { kind: string; text: string; url?: string };

function isBenign(p: Problem) {
    const hay = `${p.text} ${p.url || ""}`;
    return BENIGN.some((re) => re.test(hay));
}

type Fixtures = { guard: Problem[] };

export const test = base.extend<Fixtures>({
    guard: [async ({ page }, use, testInfo) => {
        const problems: Problem[] = [];
        if (STATS_API) {
            await page.context().addInitScript((api) => {
                try { localStorage.setItem("aho.statsApi", api); } catch { /* storage blocked */ }
            }, STATS_API);
        }
        await page.context().route(BIFROST_ANY, (route) => {
            problems.push({ kind: "tripwire", text: "Browser requested bifroststats.com (match data must come from the stats Worker)", url: route.request().url() });
            return route.abort();
        });
        page.on("console", (msg) => {
            if (msg.type() !== "error") return;
            problems.push({ kind: "console.error", text: msg.text(), url: msg.location().url });
        });
        page.on("pageerror", (err) => {
            problems.push({ kind: "pageerror", text: `${err.name}: ${err.message}`, url: (err.stack || "").split("\n")[1] });
        });
        await use(problems);
        const real = problems.filter((p) => p.kind === "tripwire" || !isBenign(p));
        const benign = problems.length - real.length;
        if (benign) testInfo.annotations.push({ type: "benign-console", description: `${benign} third-party message(s) ignored` });
        if (real.length) {
            const body = JSON.stringify(real, null, 2);
            fs.mkdirSync(testInfo.outputDir, { recursive: true });
            fs.writeFileSync(testInfo.outputPath("console-problems.json"), body);
            await testInfo.attach("console-problems.json", { body, contentType: "application/json" });
        }
        expect(real, "console errors / uncaught exceptions / tripwire hits").toEqual([]);
    }, { auto: true }]
});

export { expect };

export const APP = "/app.html";

export async function gotoRoute(page: Page, hash: string) {
    await page.goto(`${APP}${hash.startsWith("#") ? hash : "#" + hash}`);
    await expect(page.locator("#view > *").first()).toBeVisible();
}

/** Soft-asserts no page-level horizontal overflow and lists the widest offenders as evidence. */
export async function expectNoOverflow(page: Page, label: string) {
    const r = await page.evaluate(() => {
        const de = document.documentElement;
        const cw = de.clientWidth;
        const offenders: string[] = [];
        if (de.scrollWidth > cw) {
            const all = Array.from(document.body.querySelectorAll<HTMLElement>("*"));
            for (const el of all) {
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 || rect.right <= cw + 1) continue;
                const parent = el.parentElement;
                if (parent && parent !== document.body && parent.getBoundingClientRect().right > cw + 1) continue;
                const cls = typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : "";
                offenders.push(`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${cls} right=${Math.round(rect.right)}`);
                if (offenders.length >= 6) break;
            }
        }
        return { sw: de.scrollWidth, cw, offenders };
    });
    expect.soft(r.sw, `[${label}] horizontal overflow: scrollWidth ${r.sw} > clientWidth ${r.cw}. Offenders: ${r.offenders.join(" | ")}`).toBeLessThanOrEqual(r.cw);
}

export function isTouch(testInfo: TestInfo) {
    return !!testInfo.project.use.hasTouch;
}

/** Tap on touch projects, click otherwise. */
export async function press(loc: Locator, testInfo: TestInfo, position?: { x: number; y: number }) {
    if (isTouch(testInfo)) await loc.tap(position ? { position } : undefined);
    else await loc.click(position ? { position } : undefined);
}
