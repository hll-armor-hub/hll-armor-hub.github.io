import { test, expect, expectNoOverflow, press } from "./fixtures";

test("1. hub: redirect, section order, live/join cards, CTAs", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForURL(/\/app\.html#\/community$/);
    await expect(page.locator(".preloader")).toHaveCount(0);

    const hub = page.locator(".cm-hub");
    await expect(hub).toBeVisible();

    // AHO banner first, then "Pick your game" with cards in nav order.
    await expect(hub.locator(":scope > section").first()).toHaveClass(/cm-hero/);
    const firstSection = hub.locator(":scope > section").nth(1);
    await expect(firstSection).toHaveClass(/cm-pick/);
    await expect(firstSection.locator("h2")).toHaveText("Pick your game");
    const games = firstSection.locator(".cm-game");
    await expect(games.locator("h3")).toHaveText(["Wardogs", "Hell Let Loose: Vietnam", "Hell Let Loose"]);
    await expect(games.locator(".badge")).toHaveText(["Season 1", "Vietnam", "WWII"]);

    // Overall section order.
    const order = await page.evaluate(() => {
        const sels = [".cm-pick", "#cmLiveSec", "#cmStats", ".cm-bf-promo", ".cm-credits"];
        const nodes = sels.map((s) => document.querySelector(s));
        if (nodes.some((n) => !n)) return sels.filter((_, i) => !nodes[i]).map((s) => "missing " + s);
        const bad: string[] = [];
        for (let i = 1; i < nodes.length; i++) {
            if (!(nodes[i - 1]!.compareDocumentPosition(nodes[i]!) & Node.DOCUMENT_POSITION_FOLLOWING)) bad.push(`${sels[i - 1]} !< ${sels[i]}`);
        }
        return bad;
    });
    expect(order).toEqual([]);

    // Live now · Join: Wardogs then Vietnam.
    const live = page.locator("#cmLiveSec");
    await expect(live.locator("#cmLiveH")).toHaveText(/Live now · Join/);
    await expect(live.locator("article.cm-live")).toHaveCount(2);
    await expect(live.locator("article.cm-live").nth(0)).toHaveAttribute("id", "cmLive-aho-wd");
    await expect(live.locator("article.cm-live").nth(1)).toHaveAttribute("id", "cmLive-aho-hllv");
    const wd = live.locator("#cmLive-aho-wd");
    const vn = live.locator("#cmLive-aho-hllv");
    await expect(wd.getByRole("link", { name: /Launch Wardogs/ })).toHaveAttribute("href", "steam://run/1867240");
    await expect(vn.getByRole("link", { name: /Launch HLL: Vietnam/ })).toHaveAttribute("href", "steam://run/3079210");
    // Live status settles (live data or the "unavailable" fallback) instead of hanging on "Checking…".
    await expect(wd.locator('[data-live="pill"]')).not.toHaveText(/Checking/, { timeout: 20_000 });
    await expect(vn.locator('[data-live="pill"]')).not.toHaveText(/Checking/, { timeout: 20_000 });

    // How to join toggles and shows the region.
    const howto = wd.locator("details.cm-howto");
    const summary = howto.locator("summary");
    await expect(howto).not.toHaveAttribute("open", /.*/);
    await expect(howto.getByText("USEAST")).toBeHidden();
    await press(summary, testInfo);
    await expect(howto).toHaveAttribute("open", "");
    await expect(howto.getByText("USEAST")).toBeVisible();
    await expectNoOverflow(page, "hub how-to open");
    await press(summary, testInfo);
    await expect(howto).not.toHaveAttribute("open", /.*/);

    // Copy Join ID.
    const copyBtn = wd.locator("button[data-copy-id]");
    await expect(copyBtn).toHaveText(/Copy Join ID/);
    const joinId = await copyBtn.getAttribute("data-copy-id");
    await press(copyBtn, testInfo);
    await expect(copyBtn).toHaveText(/Copied/);
    const clip = await page.evaluate(() => navigator.clipboard.readText().catch((e) => "ERR " + e));
    expect(clip).toBe(joinId);

    // CTAs.
    const heroCta = page.locator(".cm-hero__cta");
    await expect(heroCta.getByRole("link", { name: /Get VIP/ })).toHaveAttribute("href", /discord\.com\/channels\/722918218305503282\/role-subscriptions/);
    await expect(heroCta.getByRole("link", { name: /Join Discord/ })).toHaveAttribute("href", /discord\.gg\//);
    const toggle = page.locator("#cmStats .cm-srv");
    await expect(toggle.locator("button.cm-srv__btn")).toHaveCount(3);
    await expect(page.locator(".cm-bf-promo a.cm-bf-promo__cta")).toHaveAttribute("href", "https://bifrostgaming.com/pricing/");
    const credits = page.locator(".cm-credits");
    await credits.scrollIntoViewIfNeeded();
    await expect(credits).toContainText("Thanks to");
    await expect(credits.getByRole("link", { name: "RazBora" })).toBeVisible();

    // Removed content stays gone.
    const text = await page.locator("body").innerText();
    for (const gone of ["TheFreshBakedGoods", "Featured content creators", "Next up"]) {
        expect(text, `"${gone}" should not be on the hub`).not.toContain(gone);
    }

    await expectNoOverflow(page, "hub");
});
