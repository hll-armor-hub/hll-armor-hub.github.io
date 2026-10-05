import { test, expect, expectNoOverflow, press } from "./fixtures";

test("6. static pages: privacy, 404, robots.txt, sitemap.xml", async ({ page, request }, testInfo) => {
    const privacy = await page.goto("/privacy.html");
    expect(privacy?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveText("Privacy Policy");
    const text = await page.locator("body").innerText();
    expect(text).toMatch(/community (server )?stats/i);
    expect(text).toContain("Bifrost");
    await expectNoOverflow(page, "privacy");

    await page.goto("/404.html");
    const back = page.getByRole("link", { name: /Back to the Hub/ });
    await expect(back).toHaveAttribute("href", "/app.html#/community");
    await expectNoOverflow(page, "404");
    await press(back, testInfo);
    await page.waitForURL(/\/app\.html#\/community$/);
    await expect(page.locator(".cm-hub")).toBeVisible();

    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toMatch(/User-agent/i);

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("<urlset");
});
