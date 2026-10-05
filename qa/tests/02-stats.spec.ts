import { test, expect, expectNoOverflow, gotoRoute, press } from "./fixtures";
import type { Page } from "@playwright/test";

async function lbSettled(page: Page) {
    const lb = page.locator("#cmLb");
    await expect(lb).not.toHaveAttribute("aria-busy", "true", { timeout: 20_000 });
    await expect(lb.locator("table, .result-empty, .cm-error").first()).toBeVisible();
    return (await lb.innerText()).trim();
}

test("2. server toggle, leaderboard, player search + profile", async ({ page }, testInfo) => {
    await gotoRoute(page, "#/community");
    const stats = page.locator("#cmStats");
    await stats.scrollIntoViewIfNeeded();
    const heading = page.locator("#cmStatsH");
    const btn = (key: string) => stats.locator(`button.cm-srv__btn[data-server="${key}"]`);

    // Default (fresh storage) is Vietnam.
    await expect(heading).toHaveText("After Hours Operators | Vietnam");
    await expect(btn("aho-hllv")).toHaveAttribute("aria-pressed", "true");

    await press(btn("aho-wd"), testInfo);
    await expect(heading).toHaveText("After Hours Operators | Wardogs");
    await expect(btn("aho-wd")).toHaveAttribute("aria-pressed", "true");
    // Wardogs history is recorded from live data once the Worker has migration 0005; before that the
    // Worker answers history: false and the no-history panel shows (08-wardogs-stats covers the widgets).
    const noHist = stats.locator(".cm-nohist");
    const wdWidgets = stats.locator("#cmLb table, #cmLb .result-empty");
    await expect(noHist.or(wdWidgets).first()).toBeVisible({ timeout: 20_000 });
    const allMatches = page.locator("#cmAllMatches");
    if (await noHist.isVisible()) {
        await expect(noHist).toContainText("No match history recorded yet");
        await expect(allMatches).toHaveAttribute("hidden", "");
        expect.soft(await allMatches.isVisible(), "'All matches' should be hidden for a server without history").toBe(false);
    } else {
        await expect(stats.locator(".cm-wd-note")).toContainText("recorded from live server data");
        await expect(page.locator("#cmLbStat option")).toHaveText(["Kills", "Deaths", "K/D", "Cash", "Matches", "Time played"]);
    }
    await expectNoOverflow(page, "stats wardogs");

    await press(btn("aho-hll"), testInfo);
    await expect(heading).toHaveText("After Hours Operators | WWII");
    await expect(page.locator("#cmAllMatches")).toBeVisible();
    await lbSettled(page);

    await press(btn("aho-hllv"), testInfo);
    await expect(heading).toHaveText("After Hours Operators | Vietnam");
    const week = await lbSettled(page);
    await expect(page.locator('[data-lb-period="week"]')).toHaveAttribute("aria-pressed", "true");
    await expectNoOverflow(page, "stats vietnam leaderboard");

    // Period tabs: each tab must fetch its own period and re-render. Content can legitimately match
    // when every recorded match is inside the last 7 days.
    const allResp = page.waitForResponse((r) => /\/v1\/leaderboard\?.*period=all/.test(r.url()));
    await press(page.locator('[data-lb-period="all"]'), testInfo);
    expect((await allResp).status()).toBe(200);
    await expect(page.locator('[data-lb-period="all"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('[data-lb-period="week"]')).toHaveAttribute("aria-pressed", "false");
    const allTime = await lbSettled(page);
    if (allTime === week) testInfo.annotations.push({ type: "note", description: "7-day and all-time leaderboards are identical (all recorded matches fall inside 7 days)" });

    // Stat select.
    await page.locator("#cmLbStat").selectOption("support");
    await expect(page.locator("#cmLb thead th").nth(2)).toHaveText("Support");
    await lbSettled(page);

    // Player search: type, arrow down, Enter.
    const search = page.locator("#cmSearch");
    await search.scrollIntoViewIfNeeded();
    await search.click();
    await search.pressSequentially("raz", { delay: 60 });
    const opts = page.locator('#cmSearchResults [role="option"]');
    await expect(opts.first()).toBeVisible({ timeout: 20_000 });
    await expect(search).toHaveAttribute("aria-expanded", "true");
    await expectNoOverflow(page, "search results open");
    await search.press("ArrowDown");
    await expect(opts.first()).toHaveAttribute("aria-selected", "true");
    await search.press("Enter");
    await page.waitForURL(/#\/community\/player\/[^/?]+/);

    // Player page.
    const totals = page.locator(".cm-totals");
    await expect(totals).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".cm-player-head h1")).not.toBeEmpty();
    for (const label of ["Kills", "Deaths", "K/D", "Combat"]) {
        await expect(totals.locator("dt", { hasText: new RegExp(`^${label.replace("/", "\\/")}$`) })).toBeVisible();
    }
    await expect(totals.locator("dd").first()).toHaveText(/\d/);
    await expectNoOverflow(page, "player page");

    const share = page.locator("#cmShare");
    await press(share, testInfo);
    await expect(share).toHaveText(/Link copied/);

    const card = page.locator(".cm-player-actions a[download]");
    const href = await card.getAttribute("href");
    expect(href).toBeTruthy();
    expect(new URL(href!).pathname).toMatch(/\.svg$/);
    const res = await page.request.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"] || "").toContain("image/svg+xml");
});
