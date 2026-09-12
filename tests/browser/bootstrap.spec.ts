import { test, expect } from "@playwright/test";

for (const width of [390, 768, 1440]) {
  test(`empty ledger and entry at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "프로그램 장부" })).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(1);
    await expect(page.getByText("첫 프로그램을 위한 자리입니다.")).toBeVisible();
    const emptyBounds = await page
      .getByRole("heading", { name: "첫 프로그램을 위한 자리입니다." })
      .boundingBox();
    expect(emptyBounds).not.toBeNull();
    expect(emptyBounds!.x + emptyBounds!.width).toBeLessThanOrEqual(width);
    await expect(page.getByRole("button", { name: "프로그램 등록" })).toBeEnabled();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "프로그램 등록" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "프로그램 등록" })).toBeVisible();
    await expect(page.getByLabel("모듈", { exact: true })).toBeFocused();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`ledger-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}
