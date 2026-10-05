import { test, expect, expectNoOverflow, gotoRoute, press } from "./fixtures";
import type { Page } from "@playwright/test";

const distance = (page: Page) => page.locator("#wdfOut .wdf-big").filter({ hasText: "Distance" }).locator(".wdf-big__v");

async function setRef(page: Page, sel: string, value: string) {
    const input = page.locator(sel);
    await input.fill("");
    await input.fill(value);
}

test("5. wardogs: theme, cash planner, WIP sections", async ({ page }, testInfo) => {
    await gotoRoute(page, "#/wardogs/s1/overview");
    await expect(page.locator("body")).toHaveClass(/theme-wardogs/);
    await expect(page.locator("#view h1")).toHaveText("Wardogs Field Desk");
    await expect(page.locator("#branchToggle")).toContainText("Season 1");
    await expect(page.locator(".wd-tile--wip")).toHaveCount(6);
    await expect(page.locator("#sectionLinks .section-link")).toHaveText(["Overview", "Cash Planner"]);
    await expectNoOverflow(page, "wardogs overview");

    // Pick your team: recolours Wardogs, carries to the community card, tap again to clear.
    const gold = () => page.evaluate(() => getComputedStyle(document.body).getPropertyValue("--gold").trim());
    const orange = await gold();
    const valkyra = page.locator('[data-team="valkyra"]');
    await press(valkyra, testInfo);
    await expect(valkyra).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-wd-team", "valkyra");
    await expect.poll(gold).toBe("#E0362A");
    await gotoRoute(page, "#/community");
    await expect(page.locator(".cm-game--wardogs .cm-game__logo")).toHaveAttribute("src", /valkyra\.png$/);
    await gotoRoute(page, "#/wardogs/s1/overview");
    await expect(page.locator('[data-team="valkyra"]')).toHaveAttribute("aria-pressed", "true");
    await press(page.locator('[data-team="valkyra"]'), testInfo);
    await expect(page.locator("html")).not.toHaveAttribute("data-wd-team", /.+/);
    await expect.poll(gold).toBe(orange);

    await gotoRoute(page, "#/wardogs/s1/maps");
    await expect(page.locator("#view h1")).toHaveText("Maps & Fire Mission");
    await expect(page.locator(".wd-soon")).toContainText("WIP");

    // Cash planner.
    await gotoRoute(page, "#/wardogs/s1/cash");
    const list = page.locator("#wdList");
    await expect(list.locator("li.wd-cash-row").first()).toBeVisible();
    const base = await list.innerText();
    await expectNoOverflow(page, "cash planner");

    const zones = page.locator("[data-zone]");
    expect(await zones.count()).toBeGreaterThan(1);
    await press(zones.nth(1), testInfo);
    await expect(zones.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => list.innerText(), { message: "zone tab changes payouts" }).not.toBe(base);

    const cats = page.locator("[data-cat]");
    const catId = await cats.nth(1).getAttribute("data-cat");
    const catLabel = (await cats.nth(1).innerText()).trim().toLowerCase();
    const beforeCat = await list.innerText();
    await press(cats.nth(1), testInfo);
    await expect(cats.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => list.innerText()).not.toBe(beforeCat);
    const rowCats = await list.locator(".wd-cash-row__cat").allInnerTexts();
    expect(rowCats.length, `rows for category ${catId}`).toBeGreaterThan(0);
    expect(new Set(rowCats.map((s) => s.trim().toLowerCase()))).toEqual(new Set([catLabel]));

    await press(page.locator('[data-cat="all"]'), testInfo);
    await page.locator("#wdSearch").fill("revive");
    await expect.poll(async () => {
        const labels = await list.locator(".wd-cash-row__label").allInnerTexts();
        return labels.length > 0 && labels.every((l) => /revive/i.test(l));
    }, { message: "search filters to revive rows" }).toBe(true);
    await expectNoOverflow(page, "cash planner filtered");
});

// Maps & Fire Mission is WIP for this build; re-enable with its route in js/app.js.
test.skip("5b. wardogs: fire mission, focus modes", async ({ page }, testInfo) => {
    // Fire mission: grid refs.
    await gotoRoute(page, "#/wardogs/s1/maps");
    await expect(page.locator("#wdfOut")).toContainText(/Enter/);
    await setRef(page, "#wdfGun", "D7");
    await setRef(page, "#wdfTgt", "F4-3");
    await expect(distance(page)).toHaveText(/^\d+m$/);
    await expect(page.locator("#wdfOut .wdf-big").filter({ hasText: "Bearing" }).first().locator(".wdf-big__v")).toHaveText(/^\d+(\.\d)?°$/);
    await expect(page.locator("#wdfOut .wdf-ctx")).toContainText("→");
    await expectNoOverflow(page, "fire mission grid");

    // Raw meters: 3-4-5 triangle.
    await setRef(page, "#wdfGun", "1000 1000");
    await setRef(page, "#wdfTgt", "1300 1400");
    await expect(distance(page)).toHaveText("500m");

    // Canvas: tap the gun, then the target.
    const canvas = page.locator("#wdfCanvas");
    await canvas.scrollIntoViewIfNeeded();
    await press(page.locator('[data-place="gun"]'), testInfo);
    const box = (await canvas.boundingBox())!;
    expect(box.width).toBeGreaterThan(100);
    await press(canvas, testInfo, { x: box.width * 0.2, y: box.height * 0.2 });
    await expect(page.locator('[data-place="tgt"]')).toHaveAttribute("aria-pressed", "true");
    await press(canvas, testInfo, { x: box.width * 0.8, y: box.height * 0.7 });
    await expect(distance(page)).not.toHaveText("500m");
    await expect(distance(page)).toHaveText(/^\d+m$/);
    const gunVal = await page.locator("#wdfGun").inputValue();
    expect(gunVal).not.toBe("1000 1000");
    await expectNoOverflow(page, "fire mission canvas");

    // Focus modes.
    await gotoRoute(page, "#/wardogs/s1/maps?focus=1");
    await expect(page.locator(".calc-focus-bar")).toBeVisible();
    await expect(page.locator("body")).toHaveClass(/calc-focus/);
    await expect(page.locator("#wdfGun")).toBeVisible();
    await expect(page.locator("#wdfCanvas")).toHaveCount(0);
    await expect(page.locator("#appFoot")).toBeHidden();
    await expectNoOverflow(page, "fire mission focus=1");

    await gotoRoute(page, "#/wardogs/s1/maps?focus=map");
    await expect(page.locator(".calc-focus-bar")).toContainText("Fire Mission Map");
    await expect(page.locator("#wdfCanvas")).toBeVisible();
    await expect(page.locator("#wdfGun")).toBeVisible();
    await expectNoOverflow(page, "fire mission focus=map");
});
