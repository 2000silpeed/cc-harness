import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.use({ actionTimeout: 1500, storageState: { cookies: [], origins: [] } });
const imported = {
  id: "restored-id",
  module: "MM",
  programName: "RESTORED",
  changeType: "수정",
  owner: "복원 담당",
  status: "개발 중",
  plannedStartDate: "2026-09-01",
  plannedEndDate: "2026-09-10",
  actualCompletionDate: "2026-08-31",
  transferDate: null,
};
const snapshot = (programs: unknown = [imported], version = 1) =>
  JSON.stringify({
    version,
    exportedAt: "2026-09-13T01:02:03.000Z",
    programs,
  });
async function upload(page: Page, text: string) {
  await page.getByLabel("백업 복원", { exact: true }).setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
}
async function names(page: Page, expected: string[]) {
  await expect(page.locator("tbody tr")).toHaveCount(expected.length);
  expect((await page.locator("tbody tr td:nth-child(2)").allTextContents()).sort()).toEqual(
    [...expected].sort(),
  );
}
function confirm(page: Page, accept: boolean, count: number) {
  const result = page.waitForEvent("dialog").then(async (dialog) => {
    const message = dialog.message();
    await (accept ? dialog.accept() : dialog.dismiss());
    expect(dialog.type()).toBe("confirm");
    expect(message).toMatch(/전체/);
    expect(message).toMatch(/교체|덮어/);
    expect(message).toContain(String(count));
  });
  return result;
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  for (const programName of ["ORIGINAL-A", "ORIGINAL-B"]) {
    await page.getByRole("button", { name: "프로그램 등록", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("모듈", { exact: true }).fill("LE");
    await dialog.getByLabel("프로그램명", { exact: true }).fill(programName);
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
  await names(page, ["ORIGINAL-A", "ORIGINAL-B"]);
});
test("B01 S01 AC1 should download whole snapshot when filters hide a record", async ({ page }) => {
  await page.getByLabel("프로그램 검색", { exact: true }).fill("ORIGINAL-A");
  await names(page, ["ORIGINAL-A"]);
  await expect(page.getByRole("button", { name: "전체 백업", exact: true })).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "전체 백업", exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const data = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(data.version).toBe(1);
  expect(new Date(data.exportedAt).toISOString()).toBe(data.exportedAt);
  expect(data.programs).toHaveLength(2);
  expect(data.programs.map((record: { programName: string }) => record.programName).sort()).toEqual(
    ["ORIGINAL-A", "ORIGINAL-B"],
  );
  for (const record of data.programs) {
    expect(record).toEqual({
      id: expect.any(String),
      module: "LE",
      programName: expect.stringMatching(/^ORIGINAL-[AB]$/),
      changeType: "",
      owner: "",
      status: "개발 대기",
      plannedStartDate: null,
      plannedEndDate: null,
      actualCompletionDate: null,
      transferDate: null,
    });
  }
});
test("B02 S05 AC2 should preview count and preserve on cancel then replace on confirm", async ({
  page,
}) => {
  await expect(page.getByLabel("백업 복원", { exact: true })).toHaveAttribute("type", "file");
  const cancelled = confirm(page, false, 1);
  await upload(page, snapshot());
  await cancelled;
  await names(page, ["ORIGINAL-A", "ORIGINAL-B"]);
  await page.reload();
  await names(page, ["ORIGINAL-A", "ORIGINAL-B"]);
  const accepted = confirm(page, true, 1);
  await upload(page, snapshot());
  await accepted;
  await expect(page.getByRole("status")).toContainText(/복원.*완료|복원.*성공/);
  await names(page, ["RESTORED"]);
  await expect(page.locator("tbody tr")).toContainText("복원 담당");
  await page.reload();
  await names(page, ["RESTORED"]);
  await expect(page.locator("tbody tr")).toContainText("복원 담당");
});
test("B03 S03 AC2 should clear empty backup only after explicit confirmation", async ({ page }) => {
  await expect(page.getByLabel("백업 복원", { exact: true })).toHaveAttribute("type", "file");
  const cancelled = confirm(page, false, 0);
  await upload(page, snapshot([]));
  await cancelled;
  await names(page, ["ORIGINAL-A", "ORIGINAL-B"]);
  const accepted = confirm(page, true, 0);
  await upload(page, snapshot([]));
  await accepted;
  await names(page, []);
  await page.reload();
  await names(page, []);
});
for (const [label, text] of [
  ["malformed", "{"],
  ["unsupported", snapshot([imported], 2)],
  [
    "duplicate",
    snapshot([imported, { ...imported, id: "other", module: " mm ", programName: " restored " }]),
  ],
  ["invalid", snapshot([{ ...imported, plannedStartDate: "2026-02-30" }])],
]) {
  test("B04 S04 AC3 should preserve and allow retry when backup is " + label, async ({ page }) => {
    let dialogs = 0;
    page.on("dialog", async (dialog) => {
      dialogs++;
      await dialog.dismiss();
    });
    await upload(page, text);
    await expect(page.getByRole("alert")).toContainText(/バックアップ|백업|복원|파일/);
    expect(dialogs).toBe(0);
    await names(page, ["ORIGINAL-A", "ORIGINAL-B"]);
    await page.reload();
    await names(page, ["ORIGINAL-A", "ORIGINAL-B"]);
    page.removeAllListeners("dialog");
    const accepted = confirm(page, true, 1);
    await upload(page, snapshot());
    await accepted;
    await names(page, ["RESTORED"]);
  });
}
test("B05 S07 AC3 should retain originals and retry when restore transaction aborts", async ({
  page,
}) => {
  await expect(page.getByLabel("백업 복원", { exact: true })).toHaveAttribute("type", "file");
  await page.evaluate(() => {
    const clear = IDBObjectStore.prototype.clear;
    IDBObjectStore.prototype.clear = function () {
      const request = clear.call(this);
      request.addEventListener("success", () => this.transaction.abort());
      IDBObjectStore.prototype.clear = clear;
      return request;
    };
  });
  const failed = confirm(page, true, 1);
  await upload(page, snapshot());
  await failed;
  await expect(page.getByRole("alert")).toContainText(/저장|복원/);
  await names(page, ["ORIGINAL-A", "ORIGINAL-B"]);
  await page.reload();
  await names(page, ["ORIGINAL-A", "ORIGINAL-B"]);
  const accepted = confirm(page, true, 1);
  await upload(page, snapshot());
  await accepted;
  await names(page, ["RESTORED"]);
  await page.reload();
  await names(page, ["RESTORED"]);
});
