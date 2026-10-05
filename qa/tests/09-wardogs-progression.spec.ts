import { test, expect, expectNoOverflow, gotoRoute, press } from "./fixtures";

// Progression is WIP for this build; re-enable with its route in js/app.js.
test.skip("9. wardogs progression: XP to target, pace, persistence", async ({ page }, testInfo) => {
    await page.addInitScript(() => {
        if (!sessionStorage.getItem("wp-cleared")) {
            localStorage.removeItem("aho.wd.prog.inputs");
            sessionStorage.setItem("wp-cleared", "1");
        }
    });
    await gotoRoute(page, "#/wardogs/s1/progression");
    await expect(page.locator("body")).toHaveClass(/theme-wardogs/);
    await expect(page.locator("#view h1")).toHaveText("Progression");
    await expect(page.locator("#wpOut .wp-big").first()).toBeVisible();
    await expectNoOverflow(page, "progression default");

    await press(page.locator('[data-track="driver"]'), testInfo);
    await expect(page.locator('[data-track="driver"]')).toHaveAttribute("aria-pressed", "true");

    await page.locator("#wpLevel").fill("20");
    await page.locator("#wpInto").fill("0");
    await page.locator("#wpTarget").fill("35");
    const xp = page.locator("#wpOut .wp-big").first().locator(".wp-big__s");
    await expect(xp).toHaveText("250,000");
    await expect(page.locator("#wpOut .wp-ctx")).toContainText("Heavy Tank");
    await expect(page.locator("#wpOut .wp-ctx .wp-tag")).toHaveCount(0);

    await press(page.locator('[data-mode="hour"]'), testInfo);
    await page.locator("#wpRate").fill("10000");
    await expect(page.locator("#wpOut .wp-big").nth(1).locator(".wp-big__v")).toContainText("25");

    await press(page.locator('[data-mode="match"]'), testInfo);
    await page.locator("#wpRate").fill("5000");
    await expect(page.locator("#wpOut .wp-big").nth(1).locator(".wp-big__v")).toContainText("50");

    const rows = page.locator("#wpWay .wp-way__row");
    await expect(rows).toHaveCount(4);
    await expect(rows.last()).toHaveClass(/is-goal/);

    await page.locator("#wpUnlock").selectOption({ label: "Lv 25 · URAL Attack" });
    await expect(page.locator("#wpTarget")).toHaveValue("25");
    await expect(xp).toHaveText("75,000");

    await page.locator("#wpTarget").fill("22");
    await expect(page.locator("#wpOut .wp-ctx .wp-tag")).toContainText(["Estimate"]);
    await expectNoOverflow(page, "progression driver");

    await press(page.locator('[data-track="career"]'), testInfo);
    await expect(page.locator("#wpTrackNote")).toContainText("Unconfirmed");
    await expect(page.locator("#wpOut .wp-ctx")).toContainText("Unconfirmed");

    await page.reload();
    await expect(page.locator('[data-track="career"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#wpLevel")).toHaveValue("20");
    await expect(page.locator('[data-mode="match"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#wpRate")).toHaveValue("5,000");

    await expect(page.locator("#wpInfo table tbody tr")).toHaveCount(10);
    const box = await page.locator("#wpLevel").boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await expectNoOverflow(page, "progression reload");
    if (process.env.QA_SHOTS) await page.screenshot({ path: `${process.env.QA_SHOTS}/progression-${testInfo.project.name}.png`, fullPage: true });

    await gotoRoute(page, "#/wardogs/s1/progression?focus=1");
    await expect(page.locator(".calc-focus-bar")).toBeVisible();
    await expect(page.locator("#wpOut .wp-big").first()).toBeVisible();
    await expectNoOverflow(page, "progression focus");
});
