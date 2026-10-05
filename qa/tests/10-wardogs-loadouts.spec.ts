import { test, expect, expectNoOverflow, gotoRoute, press } from "./fixtures";

// Loadout Builder is WIP for this build; re-enable with its route in js/app.js.
test.skip("9. wardogs loadouts: build, share link round-trip, bad links", async ({ page, context }, testInfo) => {
    await page.addInitScript(() => { try { localStorage.removeItem("wd-lo-last"); } catch { /* storage blocked */ } });
    await gotoRoute(page, "#/wardogs/s1/loadouts");
    await expect(page.locator("#view h1")).toHaveText("Loadouts");
    await expect(page.locator(".wl-card")).toBeVisible();
    await expect(page.locator(".wl-card__empty")).toBeVisible();
    await expectNoOverflow(page, "loadouts empty");

    await press(page.locator('[data-action="faction"][data-id="valkyra"]'), testInfo);
    await expect(page.locator('[data-action="faction"][data-id="valkyra"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".wl-card__faction")).toHaveText("Valkyra");
    expect(await page.locator(".wl-card").evaluate((el) => getComputedStyle(el).getPropertyValue("--fc").trim().toUpperCase())).toBe("#FA503E");

    await press(page.locator('[data-action="role"][data-id="medic"]'), testInfo);
    await expect(page.locator('[data-action="role"][data-id="medic"]')).toHaveAttribute("aria-pressed", "true");

    await press(page.locator('[data-action="open"][data-slot="primary"]'), testInfo);
    const sheet = page.locator(".wl-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.locator(".wl-pick").first()).toBeVisible();
    await expect(sheet.locator('[data-pick="pp19"]')).toContainText(/unconfirmed/i);
    await expectNoOverflow(page, "loadouts sheet open");
    const pickBox = await sheet.locator('[data-pick="a91"]').boundingBox();
    expect(pickBox!.height).toBeGreaterThanOrEqual(44);
    await press(sheet.locator('[data-pick="a91"]'), testInfo);
    await expect(sheet).toHaveCount(0);
    await expect(page.locator(".wl-card")).toContainText("A-91");

    await press(page.locator('[data-action="open"][data-slot="tools"]'), testInfo);
    await press(sheet.locator('[data-pick="largehammer"]'), testInfo);
    await expect(sheet.locator('[data-pick="largehammer"]')).toHaveAttribute("aria-checked", "true");
    await press(sheet.locator('[data-pick="wrench"]'), testInfo);
    await press(sheet.locator('[data-action="close-sheet"].wl-sheet__done'), testInfo);
    await expect(sheet).toHaveCount(0);

    await press(page.locator('[data-action="open"][data-slot="deployables"]'), testInfo);
    await press(sheet.locator('[data-pick="fob"]'), testInfo);
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);

    const card = page.locator(".wl-card");
    await expect(card).toContainText("Large hammer");
    await expect(card).toContainText("Wrench");
    await expect(card.locator(".wl-cost").first()).toContainText("$9,900");
    await expect(card).toContainText(/unconfirmed/i);
    await expectNoOverflow(page, "loadouts built");

    const hash = await page.evaluate(() => location.hash);
    expect(hash).toContain("#/wardogs/s1/loadouts?l=");
    const code = new URLSearchParams(hash.split("?")[1]).get("l");
    expect(code).toBe("1.valkyra.medic.p-a91.t-largehammer_wrench.d-fob");

    await press(page.locator('[data-action="copy"]'), testInfo);
    await expect(page.locator(".wl-copy__label")).toHaveText("Copied");
    await expect(page.locator("#wlLive")).toHaveText(/Copied/);
    const copied = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
    if (copied) expect(copied).toContain("?l=1.valkyra.medic.");

    const fresh = await context.newPage();
    await fresh.addInitScript(() => { try { localStorage.removeItem("wd-lo-last"); } catch { /* storage blocked */ } });
    await gotoRoute(fresh, `#/wardogs/s1/loadouts?l=${code}`);
    await expect(fresh.locator(".wl-card__faction")).toHaveText("Valkyra");
    await expect(fresh.locator('[data-action="role"][data-id="medic"]')).toHaveAttribute("aria-pressed", "true");
    await expect(fresh.locator(".wl-card")).toContainText("A-91");
    await expect(fresh.locator(".wl-card")).toContainText("Forward Operating Base");
    await expect(fresh.locator(".wl-notice")).toContainText("shared link");
    await fresh.close();

    await gotoRoute(page, "#/wardogs/s1/loadouts?l=1.lonestar.nope.p-a91_kh2002.x-foo.u-grenade_irrangefinder");
    await expect(page.locator(".wl-card__faction")).toHaveText("Lonestar");
    await expect(page.locator(".wl-notice")).toContainText("skipped");
    await expect(page.locator(".wl-card")).toContainText("A-91");
    await expect(page.locator(".wl-card")).toContainText("Grenade");
    await expect(page.locator(".wl-card")).not.toContainText("KH-2002");
    await expect(page.locator(".wl-card")).not.toContainText("IR rangefinder");

    await press(page.locator('[data-action="preset"][data-id="manticorestarter"]'), testInfo);
    await expect(page.locator(".wl-card__faction")).toHaveText("Manticore");
    await expect(page.locator(".wl-card")).toContainText("KH-2002");

    await press(page.locator('[data-action="remove"][data-id="kh2002"]'), testInfo);
    await expect(page.locator(".wl-card__empty")).toBeVisible();

    await expect(page.locator(".wl-discord")).toHaveAttribute("href", "https://discord.gg/guFSTDfsCb");
    await expect(page.locator(".wl-discord")).toContainText("Find one in the AHO Discord");
    await press(page.locator('[data-action="sources"]'), testInfo);
    await expect(page.locator("#wlSources")).toHaveAttribute("open", "");
    await expect(page.locator("#wlSources")).toContainText("Season 1 Changelog");
    await expectNoOverflow(page, "loadouts sources open");
});
