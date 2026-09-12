import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import * as XLSX from "xlsx";

test.use({ actionTimeout: 1500, storageState: { cookies: [], origins: [] } });
const headers = [
  "모듈",
  "프로그램명",
  "담당자",
  "변경 유형",
  "진행 상태",
  "개발 시작 예정일",
  "개발 완료 예정일",
  "실제 개발 완료일",
  "이관 예정일",
];
function workbook(rows: unknown[][]) {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([headers, ...rows]), "프로그램");
  return Buffer.from(XLSX.write(book, { type: "array", bookType: "xlsx", compression: true }));
}
async function upload(page: Page, buffer: Buffer) {
  await page.getByLabel("Excel 업로드", { exact: true }).setInputFiles({
    name: "programs.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer,
  });
}
async function unchanged(page: Page) {
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "전체 백업", exact: true }).click();
  const download = await downloadEvent;
  const backup = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(backup.programs).toHaveLength(1);
  expect(backup.programs[0]).toMatchObject({ module: "LE", programName: "ORIGINAL" });
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "프로그램 등록", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("모듈", { exact: true }).fill("LE");
  await dialog.getByLabel("프로그램명", { exact: true }).fill("ORIGINAL");
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog).toHaveCount(0);
});
test("B01 S01 AC1 should download a real template when requested", async ({ page }) => {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Excel 템플릿", exact: true }).click();
  const download = await event;
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  const book = XLSX.read(await readFile((await download.path())!), { type: "buffer" });
  expect(book.SheetNames).toHaveLength(1);
  expect(XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1 })).toEqual([
    headers,
  ]);
});
test("B02 S02 S03 AC1 AC3 should preview normalized values without saving when upload is valid", async ({
  page,
}) => {
  await upload(
    page,
    workbook([[" mm ", " new ", "담당", "신규", "", "2026-09-01", "2026-09-10", "2026-08-31", ""]]),
  );
  const region = page.getByRole("region", { name: "Excel 미리보기", exact: true });
  await expect(region).toContainText("신규 1건");
  for (const value of [
    "MM",
    "NEW",
    "담당",
    "신규",
    "개발 대기",
    "2026-09-01",
    "2026-09-10",
    "2026-08-31",
  ])
    await expect(region).toContainText(value);
  await unchanged(page);
  await page.getByRole("button", { name: "미리보기 취소", exact: true }).click();
  await expect(region).toHaveCount(0);
  await unchanged(page);
  await page.reload();
  await unchanged(page);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("ORIGINAL");
});
test("B03 S05 AC2 should display row and field errors then allow valid retry", async ({ page }) => {
  await upload(page, workbook([["LE", "BAD", "", "", "", "2026-02-30"]]));
  const region = page.getByRole("region", { name: "Excel 미리보기", exact: true });
  await expect(region).toContainText(/2\s*행|행\s*2/);
  await expect(region).toContainText("개발 시작 예정일");
  await expect(region).toContainText(/날짜/);
  await unchanged(page);
  await upload(page, workbook([["LE", "RETRY"]]));
  await expect(region).toContainText("신규 1건");
  await expect(region).toContainText("RETRY");
  await expect(region).not.toContainText("2026-02-30");
  await unchanged(page);
});
test("B04 S06 AC2 should show duplicate location when upload conflicts with stored identity", async ({
  page,
}) => {
  await upload(page, workbook([[" le ", " original "]]));
  const region = page.getByRole("region", { name: "Excel 미리보기", exact: true });
  await expect(region).toContainText(/2\s*행|행\s*2/);
  await expect(region).toContainText("프로그램명");
  await expect(region).toContainText(/중복|이미/);
  await unchanged(page);
});
test("B05 S10 AC4 should preserve stored data and allow retry when file is invalid", async ({
  page,
}) => {
  await upload(page, Buffer.from("not an xlsx"));
  await expect(page.getByRole("region", { name: "Excel 미리보기", exact: true })).toContainText(
    "파일",
  );
  await unchanged(page);
  await upload(page, workbook([["LE", "RETRY"]]));
  await expect(page.getByRole("region", { name: "Excel 미리보기", exact: true })).toContainText(
    "신규 1건",
  );
  await unchanged(page);
});
