import { test, expect, expectNoOverflow, gotoRoute, press } from "./fixtures";

/* Match data must come from the stats Worker; the fixture already fails any bifroststats.com request. */
const WORKER_LIST = /\/v1\/matches\?(.*&)?server=aho-hllv/;
const WORKER_MATCH = /\/v1\/matches\/[^/?]+\?(.*&)?server=/;

test("3. recent match -> scoreboard; match history paging", async ({ page }, testInfo) => {
    const listResp = page.waitForResponse((r) => WORKER_LIST.test(r.url()));
    await gotoRoute(page, "#/community");
    await page.locator("#cmStats").scrollIntoViewIfNeeded();
    expect((await listResp).status()).toBe(200);
    const anyCard = page.locator("#cmRecent a.cm-match").first();
    await expect(anyCard).toBeVisible({ timeout: 25_000 });
    // Prefer a match whose scoreboard has been imported; the newest one may still be pending.
    const processed = page.locator('#cmRecent a.cm-match[data-processed="1"]');
    const card = (await processed.count()) ? processed.first() : anyCard;
    await card.scrollIntoViewIfNeeded();
    const detailResp = page.waitForResponse((r) => WORKER_MATCH.test(r.url()));
    await press(card, testInfo);
    await page.waitForURL(/#\/community\/match\/[^/]+\/[^/?]+/);
    expect((await detailResp).status()).toBe(200);

    const host = page.locator("#cmMatch");
    await expect(host.locator(".cm-match-hero h1")).toBeVisible({ timeout: 25_000 });
    await expectNoOverflow(page, "match page");
    const full = host.getByRole("link", { name: /Full match on Bifrost/ });
    await expect(full).toHaveAttribute("href", /^https:\/\/bifroststats\.com\/hllv?\/[^/]+\/[^/]+$/);

    if (await host.locator(".cm-importing").count()) {
        testInfo.annotations.push({ type: "note", description: "No imported match in Recent matches; scoreboard checks skipped" });
    } else {
        await expect(host.locator(".cm-mvp").first()).toBeVisible();
        expect(await host.locator(".cm-mvp").count()).toBeGreaterThanOrEqual(1);

        // Default sort is kills; clicking Deaths flips aria-sort.
        await expect(host.locator('th[data-sort-th="kills"]')).toHaveAttribute("aria-sort", "descending");
        await press(host.locator('button[data-sort="deaths"]'), testInfo);
        await expect(host.locator('th[data-sort-th="deaths"]')).toHaveAttribute("aria-sort", "descending");
        await expect(host.locator('th[data-sort-th="kills"]')).toHaveAttribute("aria-sort", "none");

        // Team chips filter rows.
        const allRows = await host.locator("#cmSbBody tr.cm-sb-row").count();
        await press(host.locator('[data-side="allies"]'), testInfo);
        await expect(host.locator('[data-side="allies"]')).toHaveAttribute("aria-pressed", "true");
        expect(await host.locator("#cmSbBody tr.cm-sb-row").count()).toBeLessThanOrEqual(allRows);
        await press(host.locator('[data-side="all"]'), testInfo);

        // Row expand.
        const expand = host.locator("#cmSbBody .cm-expand").first();
        await expect(expand).toHaveAttribute("aria-expanded", "false");
        await press(expand, testInfo);
        await expect(expand).toHaveAttribute("aria-expanded", "true");
        await expect(host.locator('#cmSbBody tr[data-detail="0"]')).toBeVisible();
        await expect(host.locator('#cmSbBody tr[data-detail="0"]')).toContainText("Best streak");
        await expectNoOverflow(page, "match row expanded");
        await press(expand, testInfo);
        await expect(host.locator('#cmSbBody tr[data-detail="0"]')).toBeHidden();

        // Tap targets on the scoreboard controls.
        // .cm-expand is drawn at 32px; its ::before extends the hit area by 4px on each side (40px).
        for (const [sel, min] of [['button[data-sort="kills"]', 40], ['[data-side="allies"]', 40], ["#cmSbBody .cm-expand", 32]] as const) {
            const box = await host.locator(sel).first().boundingBox();
            expect.soft(box && box.height >= min, `${sel} tap target height ${box?.height} < ${min}`).toBeTruthy();
        }
    }

    // Match history paging.
    await gotoRoute(page, "#/community/matches?server=aho-hllv");
    const pager = page.locator("#cmPager");
    await expect(page.locator("#cmAll a.cm-match").first()).toBeVisible({ timeout: 25_000 });
    await expect(pager).toContainText(/Page 1 of \d+/);
    const firstP1 = await page.locator("#cmAll a.cm-match").first().getAttribute("href");
    await expectNoOverflow(page, "matches page 1");

    await press(pager.getByRole("link", { name: "Older" }), testInfo);
    await page.waitForURL(/[?&]page=2/);
    await expect(pager).toContainText(/Page 2 of \d+/, { timeout: 25_000 });
    await expect(page.locator("#cmAll a.cm-match").first()).not.toHaveAttribute("href", firstP1!);

    await press(pager.getByRole("link", { name: "Newer" }), testInfo);
    await expect(pager).toContainText(/Page 1 of \d+/, { timeout: 25_000 });
    expect(page.url()).not.toMatch(/[?&]page=/);
});

test("3b. match whose scoreboard is still importing", async ({ page }) => {
    await gotoRoute(page, "#/community/matches?server=aho-hllv");
    await expect(page.locator("#cmAll a.cm-match").first()).toBeVisible({ timeout: 25_000 });
    const pending = page.locator("#cmAll a.cm-match:not([data-processed])");
    test.skip(!(await pending.count()), "every match on page 1 is already imported");
    const href = await pending.first().getAttribute("href");
    await gotoRoute(page, href!);
    const host = page.locator("#cmMatch");
    await expect(host.locator(".cm-match-hero h1")).toBeVisible({ timeout: 25_000 });
    await expect(host.locator(".cm-importing")).toBeVisible();
    await expect(host.getByRole("link", { name: /Full match on Bifrost/ })).toBeVisible();
    await expect(host.locator("#cmSbBody")).toHaveCount(0);
    await expectNoOverflow(page, "importing match page");
});
