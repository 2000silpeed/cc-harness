import { expect, test, type Page } from "@playwright/test";

test.use({ actionTimeout: 1500, storageState: { cookies: [], origins: [] } });

const programName = `SCHEDULE-${"LONG-NAME-".repeat(12)}`;
async function register(page: Page, start = "2026-09-10", end = "2026-09-12") {
  await page.clock.install({ time: new Date("2026-09-13T12:00:00+09:00") });
  await page.goto("/");
  await page.getByRole("button", { name: "프로그램 등록", exact: true }).click();
  const dialog = page.getByRole("dialog");
  for (const [label, value] of Object.entries({
    모듈: "LE",
    프로그램명: programName,
    담당자: "김담당",
    "변경 유형": "긴 변경 유형 ".repeat(20),
    "개발 시작 예정일": start,
    "개발 완료 예정일": end,
    "실제 개발 완료일": "2026-09-20",
    "이관 예정일": "2026-09-30",
  }))
    await dialog.getByLabel(label, { exact: true }).fill(value);
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("tbody tr")).toHaveCount(1);
}

async function showSchedule(page: Page) {
  await page.getByRole("checkbox", { name: "간트 보기", exact: true }).check();
  await page.getByRole("button", { name: "오늘", exact: true }).click();
  await expect(page.getByText("2026-09", { exact: true })).toBeVisible();
}

test("B01 AC1 AC3 should preserve compact nine columns when gantt is toggled", async ({ page }) => {
  await register(page);
  const row = page.locator("tbody tr");
  const toggle = page.getByRole("checkbox", { name: "간트 보기", exact: true });
  await expect(toggle).not.toBeChecked();
  await expect(page.getByRole("columnheader")).toHaveCount(9);
  await expect(row.getByRole("cell")).toHaveCount(9);
  await expect(row.locator("svg")).toHaveCount(0);
  const before = await row.getByRole("cell").allTextContents();
  await showSchedule(page);
  await expect(page.getByRole("table")).toHaveCount(1);
  await expect(page.getByRole("columnheader")).toHaveCount(10);
  await expect(row.getByRole("cell")).toHaveCount(10);
  const svg = row.getByRole("cell").nth(9).locator("svg");
  await expect(svg).toHaveCount(1);
  await expect(svg).toHaveAttribute("viewBox", /^0 0 30 \d+(\.\d+)?$/);
  await expect(svg.locator("[style]")).toHaveCount(0);
  await expect(svg).not.toHaveAttribute("style");
  await expect(svg.locator("rect")).toHaveAttribute("x", "9");
  await expect(svg.locator("rect")).toHaveAttribute("width", "3");
  await toggle.uncheck();
  await expect(row.getByRole("cell")).toHaveCount(9);
  expect(await row.getByRole("cell").allTextContents()).toEqual(before);
});

for (const start of ["", "2026-09-10"]) {
  test(`B02 AC2 should show a transfer-only marker when planned end is missing (${start})`, async ({
    page,
  }) => {
    await register(page, start, "");
    await showSchedule(page);
    const cell = page.locator("tbody tr").getByRole("cell").nth(9);
    await expect(cell).toContainText("일정 미정");
    await expect(cell.locator("svg rect")).toHaveCount(0);
    await expect(cell.getByLabel("이관 예정일 2026-09-30", { exact: true })).toBeVisible();
  });
}

test("B03 AC3 should preserve every field when navigating months and returning today", async ({
  page,
}) => {
  await register(page);
  const row = page.locator("tbody tr");
  const before = await row.getByRole("cell").allTextContents();
  await showSchedule(page);
  for (const [button, month] of [
    ["이전달", "2026-08"],
    ["다음달", "2026-09"],
    ["다음달", "2026-10"],
    ["오늘", "2026-09"],
  ]) {
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(page.getByText(month, { exact: true })).toBeVisible();
    await expect(row).toHaveCount(1);
    expect((await row.getByRole("cell").allTextContents()).slice(0, 9)).toEqual(before);
    await expect(row.locator("svg rect")).toHaveCount(month === "2026-09" ? 1 : 0);
    await expect(row.getByLabel("이관 예정일 2026-09-30", { exact: true })).toHaveCount(
      month === "2026-09" ? 1 : 0,
    );
  }
  await page.reload();
  expect((await row.getByRole("cell").allTextContents()).slice(0, 9)).toEqual(before);
  await row.getByRole("button", { name: /프로그램명/ }).click();
  const dialog = page.getByRole("dialog", { name: "프로그램 수정", exact: true });
  await expect(dialog.getByLabel("개발 시작 예정일", { exact: true })).toHaveValue("2026-09-10");
  await expect(dialog.getByLabel("개발 완료 예정일", { exact: true })).toHaveValue("2026-09-12");
  await expect(dialog.getByLabel("실제 개발 완료일", { exact: true })).toHaveValue("2026-09-20");
  await expect(dialog.getByLabel("이관 예정일", { exact: true })).toHaveValue("2026-09-30");
});

test("B04 AC4 should keep schedule inside the same tr when long content scrolls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await register(page);
  await showSchedule(page);
  const row = page.locator("tbody tr");
  const scheduleCell = row.getByRole("cell").nth(9);
  await scheduleCell.scrollIntoViewIfNeeded();
  await expect(scheduleCell.locator("svg")).toBeVisible();
  expect(
    await row.evaluate((element) => {
      const cells = [...element.querySelectorAll("td")];
      const bounds = element.getBoundingClientRect();
      return {
        shared: cells.length === 10 && cells.every((cell) => cell.closest("tr") === element),
        aligned: cells.every((cell) => Math.abs(cell.getBoundingClientRect().top - bounds.top) < 1),
        sameHeight: cells.every(
          (cell) => Math.abs(cell.getBoundingClientRect().height - bounds.height) < 1,
        ),
      };
    }),
  ).toEqual({ shared: true, aligned: true, sameHeight: true });
  await row.getByRole("cell").first().scrollIntoViewIfNeeded();
  await expect(row.getByRole("button", { name: /프로그램명/ })).toHaveAccessibleName(
    new RegExp(programName),
  );
});
