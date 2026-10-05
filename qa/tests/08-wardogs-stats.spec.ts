import { test, expect, expectNoOverflow, gotoRoute, press } from "./fixtures";
import type { Page } from "@playwright/test";

/* Wardogs stats are recorded by the Worker from live data. Needs a local Worker with synthetic matches:
   QA_STATS_API=http://127.0.0.1:8790 after `node test/seed-local.mjs` in worker/ (see worker/README.md). */
const LOCAL = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(process.env.QA_STATS_API || "");

async function openWardogsStats(page: Page, testInfo: Parameters<typeof press>[1]) {
    await gotoRoute(page, "#/community");
    const stats = page.locator("#cmStats");
    await stats.scrollIntoViewIfNeeded();
    await press(stats.locator('button.cm-srv__btn[data-server="aho-wd"]'), testInfo);
    await expect(page.locator("#cmStatsH")).toHaveText("After Hours Operators | Wardogs");
    return stats;
}

test.describe("8. wardogs stats (local Worker with synthetic data)", () => {
    test.skip(!LOCAL, "set QA_STATS_API to a local Worker seeded with worker/test/seed-local.mjs");

    test("8a. hub widgets: note, faction win rates, POTW, leaderboard, recent matches", async ({ page }, testInfo) => {
        const stats = await openWardogsStats(page, testInfo);
        await expect(stats.locator(".cm-nohist")).toHaveCount(0);
        await expect(stats.locator(".cm-wd-note")).toContainText("recorded from live server data once a minute");
        await expect(stats.locator(".cm-wd-note")).toContainText(/started on/);
        await expect(stats.locator(".cm-wd-note")).toContainText("approximate");

        const glance = stats.locator("#cmGlance");
        await expect(glance.locator(".cm-fwr")).toBeVisible();
        await expect(glance.locator(".cm-fwr__list li")).toHaveCount(3);
        for (const f of ["Lonestar", "Valkyra", "Manticore"]) await expect(glance.locator(".cm-fwr__list")).toContainText(f);
        const lonestar = glance.locator(".cm-fchip", { hasText: "Lonestar" }).first();
        expect(await lonestar.evaluate((el) => getComputedStyle(el).getPropertyValue("--fc").trim().toUpperCase())).toBe("#4CB1EF");

        const potw = stats.locator("#cmPotw");
        await expect(potw.locator(".cm-potw__cat")).toHaveText(["Top Kills", "Best K/D", "Top Earner"]);

        const select = page.locator("#cmLbStat");
        await expect(select.locator("option")).toHaveText(["Kills", "Deaths", "K/D", "Cash", "Matches", "Time played"]);
        await expect(page.locator("#cmLb table tbody tr").first()).toBeVisible();
        await select.selectOption("cash");
        await expect(page.locator("#cmLb thead th").nth(2)).toHaveText("Cash");
        await expect(page.locator("#cmLb table tbody tr").first()).toBeVisible();

        const cards = stats.locator("#cmRecent a.cm-match--wd");
        await expect(cards.first()).toBeVisible();
        await expect(cards.first().locator(".cm-fscore__f")).toHaveCount(3);
        await expect(cards.first().locator(".cm-fscore__f.win")).toHaveCount(1);
        await expect(page.locator("#cmAllMatches")).toBeVisible();
        await expect(page.locator("#cmBfStats")).toContainText("Bifrost");
        await expectNoOverflow(page, "wardogs stats hub");

        // Switching back to an HLL server restores its own stat list.
        await press(stats.locator('button.cm-srv__btn[data-server="aho-hllv"]'), testInfo);
        await expect(select.locator('option[value="combat"]')).toHaveCount(1);
        await expect(stats.locator(".cm-wd-note")).toHaveCount(0);
    });

    test("8b. match page, player page and match history", async ({ page }, testInfo) => {
        const stats = await openWardogsStats(page, testInfo);
        const card = stats.locator("#cmRecent a.cm-match--wd").first();
        await card.scrollIntoViewIfNeeded();
        await press(card, testInfo);
        await page.waitForURL(/#\/community\/match\/[^/]+\/[^/?]+\?server=aho-wd/);

        const host = page.locator("#cmMatch");
        await expect(host.locator(".cm-match-hero h1")).toBeVisible();
        await expect(host.locator(".cm-fscore--big .cm-fscore__f")).toHaveCount(3);
        await expect(host.getByRole("link", { name: /Wardogs server on Bifrost/ })).toHaveAttribute("href", /^https:\/\/bifroststats\.com\/wd\/leaderboards\/servers\//);
        await expect(host.locator(".cm-mvp__t")).toHaveText(["Most kills", "Top earner", "Best K/D"]);
        await expect(host.locator(".cm-sb thead th")).toHaveText(["#", "Player", "Faction", "K", "D", "K/D", "Cash", "Time"]);
        await expectNoOverflow(page, "wardogs match page");

        await press(host.locator('button[data-sort="cash"]'), testInfo);
        await expect(host.locator('th[data-sort-th="cash"]')).toHaveAttribute("aria-sort", "descending");
        const cash = await host.locator("#cmSbBody tr td:nth-child(7)").allInnerTexts();
        const nums = cash.map((s) => Number(s.replace(/,/g, "")));
        expect(nums).toEqual([...nums].sort((a, b) => b - a));

        const all = await host.locator("#cmSbBody tr.cm-sb-row").count();
        await press(host.locator('[data-side="Valkyra"]'), testInfo);
        await expect(host.locator('[data-side="Valkyra"]')).toHaveAttribute("aria-pressed", "true");
        const sides = await host.locator("#cmSbBody tr.cm-sb-row td:nth-child(3)").allInnerTexts();
        expect(sides.length).toBeLessThan(all);
        expect(new Set(sides.map((s) => s.trim().toLowerCase()))).toEqual(new Set(["valkyra"]));
        for (const sel of ['button[data-sort="cash"]', '[data-side="Lonestar"]', '[data-side="all"]']) {
            const box = await host.locator(sel).first().boundingBox();
            expect.soft(box && box.height >= 40, `${sel} tap target height ${box?.height} < 40`).toBeTruthy();
        }
        await press(host.locator('[data-side="all"]'), testInfo);

        // Player page.
        const player = host.locator("#cmSbBody .cm-sb-name a").first();
        await press(player, testInfo);
        await page.waitForURL(/#\/community\/player\/wd-[0-9a-f]+/);
        const totals = page.locator(".cm-totals");
        await expect(totals).toBeVisible();
        await expect(totals.locator("dt")).toHaveText(["Kills", "Deaths", "K/D", "Cash", "Wins", "Losses", "Matches", "Time played"]);
        await expect(totals.locator("dd").first()).toHaveText(/\d/);
        await expect(page.locator(".cm-recent").first()).toBeVisible();
        await expect(page.locator(".cm-recent .cm-fchip").first()).toBeVisible();
        await expect(page.locator(".cm-wd-note")).toBeVisible();
        await expectNoOverflow(page, "wardogs player page");
        const href = await page.locator(".cm-player-actions a[download]").getAttribute("href");
        const res = await page.request.get(href!);
        expect(res.status()).toBe(200);
        expect(await res.text()).toContain("CASH");

        // Match history.
        await gotoRoute(page, "#/community/matches?server=aho-wd");
        await expect(page.locator("#cmAll a.cm-match--wd").first()).toBeVisible();
        await expect(page.locator("#cmPager")).toContainText(/Page 1 of \d+/);
        await expectNoOverflow(page, "wardogs match history");
    });
});
