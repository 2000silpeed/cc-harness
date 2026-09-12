import { expect, test, type Page } from "@playwright/test";

test.use({ actionTimeout: 1500 });
for (const width of [390, 768, 1440]) {
  test(`compact ledger preserves one row and full text at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await openRegistration(page);
    await fillIdentity(page);
    const programName = "ZGWLEJ10000_".repeat(8);
    await page.getByLabel("프로그램명", { exact: true }).fill(programName);
    await page.getByLabel("변경 유형", { exact: true }).fill("ODATA 신규 개발 ".repeat(12));
    await page.getByLabel("실제 개발 완료일", { exact: true }).fill("2026-07-10");
    await page.getByLabel("이관 예정일", { exact: true }).fill("2026-09-06");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const row = page.locator("tbody tr");
    await expect(row.getByRole("cell")).toHaveCount(9);
    await expect(row.getByRole("cell").nth(7)).toHaveText("2026-07-10");
    await expect(row.getByRole("cell").nth(8)).toHaveText("2026-09-06");
    expect((await row.boundingBox())!.height).toBe(48);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const nameButton = row.getByRole("button", {
      name: `프로그램명 수정: ${programName}`,
      exact: true,
    });
    expect(await nameButton.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
      true,
    );
    await nameButton.focus();
    await nameButton.press("Enter");
    await expect(page.getByRole("dialog", { name: "프로그램 수정" })).toContainText(programName);
    await page.getByRole("button", { name: "취소", exact: true }).click();
    await expect(nameButton).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`compact-${width}.png`), fullPage: true });
  });
}
async function openRegistration(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "프로그램 등록", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "프로그램 등록" })).toBeVisible({ timeout: 1500 });
}
async function fillIdentity(page: Page) {
  await page.getByLabel("모듈", { exact: true }).fill(" le ");
  await page.getByLabel("프로그램명", { exact: true }).fill(" zgwlej10000 ");
}
test("S16 should open registration with focus and default status", async ({ page }) => {
  await openRegistration(page);
  await expect(page.getByLabel("모듈", { exact: true })).toBeFocused();
  await expect(page.getByLabel("진행 상태", { exact: true })).toHaveValue("개발 대기");
});
test("S06 S17 should persist normalized registration and escape optional text after reload", async ({
  page,
}) => {
  await openRegistration(page);
  await fillIdentity(page);
  await page.getByLabel("담당자", { exact: true }).fill("이성운");
  await page.getByLabel("변경 유형", { exact: true }).fill('<img src=x onerror="alert(1)">');
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  const row = page.getByRole("row").filter({ hasText: "ZGWLEJ10000" });
  await expect(row).toContainText("LE");
  await expect(row).toContainText("이성운");
  await expect(row.getByRole("cell", { name: "시작 예정 미정", exact: true })).toHaveText("—");
  await expect(row.getByRole("cell", { name: "완료 예정 미정", exact: true })).toHaveText("—");
  await expect(row.getByRole("img")).toHaveCount(0);
});
test("S11 should show duplicate error and retain draft", async ({ page }) => {
  await openRegistration(page);
  await fillIdentity(page);
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const beforeRows = await page.locator("tbody").textContent();
  await page.getByRole("button", { name: "프로그램 등록", exact: true }).click();
  await fillIdentity(page);
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("중복");
  await expect(page.getByLabel("프로그램명", { exact: true })).toBeFocused();
  await expect(page.getByLabel("프로그램명", { exact: true })).toHaveValue(" zgwlej10000 ");
  await expect(page.getByRole("row").filter({ hasText: "ZGWLEJ10000" })).toHaveCount(1);
  expect(await page.locator("tbody").textContent()).toBe(beforeRows);
});
test("S18 should retain draft on save failure and allow a successful retry", async ({ page }) => {
  await openRegistration(page);
  await fillIdentity(page);
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "프로그램 등록", exact: true }).click();
  await fillIdentity(page);
  await page.getByLabel("프로그램명", { exact: true }).fill(" new-program ");
  await page.getByLabel("담당자", { exact: true }).fill("이성운");
  await page.getByLabel("변경 유형", { exact: true }).fill("ODATA 신규 개발");
  await page.getByLabel("실제 개발 완료일", { exact: true }).fill("2026-07-10");
  await page.getByLabel("이관 예정일", { exact: true }).fill("2026-09-06");
  const beforeRows = await page.locator("tbody").textContent();
  const beforeDraft = await page
    .locator("dialog input, dialog select")
    .evaluateAll((elements) => elements.map((element) => (element as HTMLInputElement).value));
  await page.evaluate(() => {
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (...args) {
      IDBObjectStore.prototype.add = add;
      const request = add.apply(this, args);
      this.transaction.abort();
      return request;
    };
  });
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("저장");
  await expect(page.getByLabel("프로그램명", { exact: true })).toHaveValue(" new-program ");
  expect(await page.locator("tbody").textContent()).toBe(beforeRows);
  expect(
    await page
      .locator("dialog input, dialog select")
      .evaluateAll((elements) => elements.map((element) => (element as HTMLInputElement).value)),
  ).toEqual(beforeDraft);
  await expect(page.getByRole("row").filter({ hasText: "ZGWLEJ10000" })).toHaveCount(1);
  await page.getByRole("button", { name: /재시도|저장/, exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: "ZGWLEJ10000" })).toHaveCount(1);
  await expect(page.getByRole("row").filter({ hasText: "NEW-PROGRAM" })).toHaveCount(1);
});

test("S15 should show initial load failure instead of an empty success", async ({ page }) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = function () {
      throw new DOMException("Test storage unavailable", "SecurityError");
    };
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 1500 });
  await expect(page.getByRole("button", { name: "프로그램 등록", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: /재시도/ })).toBeVisible();
});

test("S19 should disable duplicate submission while a real transaction is pending", async ({
  page,
}) => {
  await openRegistration(page);
  await fillIdentity(page);
  await page.evaluate(() => {
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (...args) {
      const request = add.apply(this, args);
      const until = performance.now() + 1000;
      const pump = () => {
        if (performance.now() < until) this.count().addEventListener("success", pump);
      };
      pump();
      return request;
    };
  });
  const save = page.getByRole("button", { name: "저장", exact: true });
  await save.click();
  await expect(save).toBeDisabled();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: "ZGWLEJ10000" })).toHaveCount(1);
});

test("S20 should preserve a dirty draft when discard is declined", async ({ page }) => {
  await openRegistration(page);
  await fillIdentity(page);
  let confirmations = 0;
  page.on("dialog", async (dialog) => {
    confirmations += 1;
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "취소", exact: true }).click();
  expect(confirmations).toBe(1);
  await expect(page.getByRole("dialog", { name: "프로그램 등록" })).toBeVisible();
  await expect(page.getByLabel("프로그램명", { exact: true })).toHaveValue(" zgwlej10000 ");
});
test("S20 should cancel unchanged registration and return focus", async ({ page }) => {
  await openRegistration(page);
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "프로그램 등록", exact: true })).toBeFocused();
});
