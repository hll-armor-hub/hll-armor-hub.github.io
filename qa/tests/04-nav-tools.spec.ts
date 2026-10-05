import { test, expect, expectNoOverflow, gotoRoute, press } from "./fixtures";
import type { Page } from "@playwright/test";

const hashOf = (page: Page) => new URL(page.url()).hash;

test("4. nav: game tabs, branch toggle, legacy route, WWII + Vietnam tools", async ({ page }, testInfo) => {
    await gotoRoute(page, "#/community");
    const tabs = page.locator("#gameTabs");
    await expect(tabs.locator("a.game-tab")).toHaveCount(4);
    expect(await tabs.locator("a.game-tab").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label"))))
        .toEqual(["Community", "Wardogs", "HLL Vietnam", "HLL WWII"]);
    await expect(tabs.getByRole("link", { name: "Community" })).toHaveAttribute("aria-current", "page");
    await expect(page.locator("#appSubnav")).toBeHidden();

    // Vietnam tab lands on Armor; toggle to Infantry keeps the game.
    await press(tabs.getByRole("link", { name: "HLL Vietnam" }), testInfo);
    await page.waitForURL(/#\/armor\/vietnam\/overview$/);
    await expect(tabs.getByRole("link", { name: "HLL Vietnam" })).toHaveAttribute("aria-current", "page");
    await expectNoOverflow(page, "armor vietnam overview");
    await press(page.locator("#branchToggle a.branch-btn", { hasText: "Infantry" }), testInfo);
    await page.waitForURL(/#\/infantry\/vietnam\/overview$/);
    await expect(tabs.getByRole("link", { name: "HLL Vietnam" })).toHaveAttribute("aria-current", "page");
    await expect(page.locator("#branchToggle a.branch-btn.active")).toHaveText(/Infantry/);

    // Switching game keeps the branch.
    await press(tabs.getByRole("link", { name: "HLL WWII" }), testInfo);
    await page.waitForURL(/#\/infantry\/wwii\//);
    await expect(page.locator("#branchToggle a.branch-btn.active")).toHaveText(/Infantry/);
    await expectNoOverflow(page, "infantry wwii");
    await press(page.locator("#branchToggle a.branch-btn", { hasText: "Armor" }), testInfo);
    await page.waitForURL(/#\/armor\/wwii\//);
    await press(tabs.getByRole("link", { name: "HLL Vietnam" }), testInfo);
    await page.waitForURL(/#\/armor\/vietnam\//);

    // Legacy bookmark.
    await gotoRoute(page, "#/armor/wwii/ranging");
    await expect(page.locator("#view h1")).toHaveText("Calculators & Sights");
    await expect(page.locator("#sectionLinks a.section-link.active")).toHaveText("Calcs & Sights");
    await expectNoOverflow(page, "calcs & sights");

    // WWII Tank Database: there is no text search, so filter by faction + type, then inspect a tank card.
    await gotoRoute(page, "#/armor/wwii/tanks");
    await expect(page.locator("#view h1")).toHaveText("Tank Database");
    const grid = page.locator("#tankGrid");
    const all = await grid.locator("article.tank-card").count();
    expect(all).toBeGreaterThan(5);
    await press(page.locator('[data-faction-filter="germany"]'), testInfo);
    await expect(page.locator('[data-faction-filter="germany"]')).toHaveClass(/active/);
    const factions = await grid.locator("article.tank-card").evaluateAll((els) => els.map((e) => e.getAttribute("data-faction")));
    expect(factions.length).toBeGreaterThan(0);
    expect(new Set(factions)).toEqual(new Set(["germany"]));
    await press(page.locator('[data-type-filter="heavy"]'), testInfo);
    const heavy = grid.locator("article.tank-card");
    expect(await heavy.count()).toBeGreaterThan(0);
    expect(await heavy.count()).toBeLessThan(factions.length + 1);
    const tank = heavy.first();
    await tank.scrollIntoViewIfNeeded();
    await expect(tank.locator(".tank-card__title")).not.toBeEmpty();
    await expect(tank.locator(".spec-grid .spec").first()).toBeVisible();
    await expect(tank.locator(".hull-pen table.matrix")).toBeVisible();
    await expectNoOverflow(page, "tank db filtered");
    // Reset module-level filter state for later tests in this page.
    await press(page.locator('[data-faction-filter="all"]'), testInfo);
    await press(page.locator('[data-type-filter="all"]'), testInfo);

    // WWII Tankulator.
    await gotoRoute(page, "#/armor/wwii/tankulator");
    const tankNames = await page.locator('#tkAttacker optgroup[label="Tanks"] option').evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
    expect(tankNames.length).toBeGreaterThan(3);
    const shooter = tankNames.find((n) => /Panther/i.test(n)) || tankNames[0];
    const target = tankNames.find((n) => /Sherman/i.test(n) && n !== shooter) || tankNames[1];
    await page.locator("#tkAttacker").selectOption(shooter);
    await page.locator("#tkTarget").selectOption(target);
    await page.locator("#tkFace").selectOption("left");
    const result = page.locator("#tkResult .tk-verdict");
    await expect(result).toBeVisible();
    await expect(result).toContainText(/shots? to kill|Cannot penetrate/);
    const front = await page.locator("#tkResult").innerHTML();
    await page.locator("#tkFace").selectOption("rear");
    await expect(page.locator("#tkResult")).toContainText(/rear/i);
    expect(await page.locator("#tkResult").innerHTML()).not.toBe(front);
    await expectNoOverflow(page, "wwii tankulator");

    // Vietnam roster + Tankulator.
    await gotoRoute(page, "#/armor/vietnam/tanks");
    await expect(page.locator("#view h1")).toHaveText("Vietnam Tank Roster");
    await expect(page.locator(".tank-card__title")).toHaveText([/M48/, /T-54/]);
    await expectNoOverflow(page, "vietnam roster");

    await gotoRoute(page, "#/armor/vietnam/tankulator");
    const loc = page.locator("#vnTkLoc");
    await expect.poll(() => loc.locator("option").count()).toBeGreaterThan(1);
    const locs = await loc.locator("option").evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
    expect(locs.length).toBeGreaterThan(1);
    await loc.selectOption(locs[locs.length - 1]);
    const big = page.locator("#vnTkResult .tk-verdict__big strong");
    await expect(big).toHaveText(/^\d+$/);
    const chip = page.locator(`#vnTkLocs [data-vn-loc="${locs[0]}"]`);
    await press(chip, testInfo);
    await expect(chip).toHaveClass(/active/);
    await expect(loc).toHaveValue(locs[0]);
    await expect(big).toHaveText(/^\d+$/);
    await expectNoOverflow(page, "vietnam tankulator");

    // Vietnam Infantry mortar: 200 m -> round(109.466 - 0.243359 * 200) = 61 mils.
    await gotoRoute(page, "#/infantry/vietnam/mortar");
    // The input auto-calculates ~450 ms after typing, then clears itself.
    await page.locator("#vnMortarDist").fill("200");
    await expect(page.locator("#vnMortarResult .mills")).toHaveText("61");
    await expect(page.locator("#vnMortarResult")).toContainText("200m");
    await expectNoOverflow(page, "vietnam mortar");
    // Explicit Calculate path (type + Enter before the auto-run fires).
    await page.locator("#vnMortarDist").fill("300");
    await page.locator("#vnMortarDist").press("Enter");
    await expect(page.locator("#vnMortarResult .mills")).toHaveText("36");
    // A user who taps Calculate after the auto-run should keep their result.
    await page.locator("#vnMortarDist").fill("200");
    await expect(page.locator("#vnMortarResult .mills")).toHaveText("61");
    await press(page.locator("#vnMortarCalc"), testInfo);
    const keptResult = await page.locator("#vnMortarResult .mills").isVisible();
    if (!keptResult) await page.screenshot({ path: testInfo.outputPath("bug-mortar-calculate-wipes-result.png") });
    expect.soft(keptResult, `Calculate after auto-calc replaced the result with: "${(await page.locator("#vnMortarResult").innerText()).trim()}"`).toBe(true);
    expect(hashOf(page)).toBe("#/infantry/vietnam/mortar");
});
