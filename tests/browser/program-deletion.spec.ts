import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { ProgramRecord } from "../../src/domain/program";

test.use({ actionTimeout: 1500, storageState: { cookies: [], origins: [] } });
const editor = (page: Page) => page.getByRole("dialog", { name: "프로그램 수정", exact: true });
const removeButton = (page: Page) =>
  editor(page).getByRole("button", { name: "프로그램 삭제", exact: true });
async function records(page: Page): Promise<ProgramRecord[]> {
  return page.evaluate(
    () =>
      new Promise<ProgramRecord[]>((resolve, reject) => {
        const request = indexedDB.open("pm-program-tracker", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const connection = request.result;
          const transaction = connection.transaction("programs", "readonly");
          const read = transaction.objectStore("programs").getAll();
          transaction.oncomplete = () => {
            connection.close();
            resolve(read.result);
          };
          transaction.onabort = () => {
            connection.close();
            reject(transaction.error);
          };
        };
      }),
  );
}
async function confirmDelete(page: Page, accept: boolean, keyboard = false) {
  await expect(removeButton(page)).toBeVisible();
  const confirmation = page.waitForEvent("dialog").then(async (dialog) => {
    const message = dialog.message();
    await (accept ? dialog.accept() : dialog.dismiss());
    expect(dialog.type()).toBe("confirm");
    expect(message).toContain("LE");
    expect(message).toContain("DELETE-A");
    expect(message).toMatch(/백업/);
    expect(message).toMatch(/복구.*(없|불가|못)/);
    expect(message).toMatch(/(미저장|저장하지 않은|작성 중|저장 전)/);
    expect(message).toMatch(/(폐기|버|사라|삭제)/);
  });
  if (keyboard) {
    await removeButton(page).focus();
    await page.keyboard.press("Enter");
  } else await removeButton(page).click();
  await confirmation;
}
async function assertDraft(page: Page) {
  await expect(editor(page).getByLabel("모듈", { exact: true })).toHaveValue("MM");
  await expect(editor(page).getByLabel("프로그램명", { exact: true })).toHaveValue("DELETE-B");
  await expect(editor(page).getByLabel("담당자", { exact: true })).toHaveValue("미저장 담당");
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  for (const programName of ["DELETE-A", "DELETE-B"]) {
    await page.getByRole("button", { name: "프로그램 등록", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("모듈", { exact: true }).fill("LE");
    await dialog.getByLabel("프로그램명", { exact: true }).fill(programName);
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
  await page.getByRole("button", { name: "프로그램명 수정: DELETE-A", exact: true }).press("Enter");
  await editor(page).getByLabel("모듈", { exact: true }).fill("MM");
  await editor(page).getByLabel("프로그램명", { exact: true }).fill("DELETE-B");
  await editor(page).getByLabel("담당자", { exact: true }).fill("미저장 담당");
});
test("S06 AC1 AC2 should preserve draft and both records when native confirmation is cancelled", async ({
  page,
}) => {
  const before = await records(page);
  await expect(page.getByRole("columnheader")).toHaveCount(9);
  await expect(page.locator("tbody tr").first().getByRole("cell")).toHaveCount(9);
  await expect(page.locator("tbody").getByRole("button", { name: "프로그램 삭제" })).toHaveCount(0);
  await confirmDelete(page, false);
  await assertDraft(page);
  expect(await records(page)).toEqual(before);
  await expect(page.locator("tbody tr")).toHaveCount(2);
});
test("S07 AC1 AC2 should delete saved editing id and restore registration focus when confirmed by keyboard", async ({
  page,
}) => {
  const before = await records(page);
  await confirmDelete(page, true, true);
  await expect(editor(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "프로그램 등록", exact: true })).toBeFocused();
  const remaining = before.filter((record) => record.programName === "DELETE-B");
  expect(await records(page)).toEqual(remaining);
  await page.reload();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  expect(await records(page)).toEqual(remaining);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "전체 백업", exact: true }).click();
  const download = await downloaded;
  expect(JSON.parse(await readFile((await download.path())!, "utf8")).programs).toEqual(remaining);
});
test("S08 AC3 should preserve draft and rows without false success when delete succeeds then aborts and allow retry", async ({
  page,
}) => {
  const before = await records(page);
  const rows = await page.locator("tbody").textContent();
  await page.evaluate(() => {
    const remove = IDBObjectStore.prototype.delete;
    IDBObjectStore.prototype.delete = function (...args) {
      const request = remove.apply(this, args);
      if (this.name === "programs") {
        IDBObjectStore.prototype.delete = remove;
        request.addEventListener("success", () => this.transaction.abort());
      }
      return request;
    };
  });
  await confirmDelete(page, true);
  await expect(editor(page).getByRole("alert")).toContainText(/다시|재시도/);
  await assertDraft(page);
  expect(await page.locator("tbody").textContent()).toBe(rows);
  expect(await records(page)).toEqual(before);
  await expect(page.getByRole("status").filter({ hasText: /삭제.*완료|삭제.*성공/ })).toHaveCount(
    0,
  );
  await confirmDelete(page, true);
  await expect(editor(page)).toHaveCount(0);
  expect(await records(page)).toEqual(before.filter((record) => record.programName === "DELETE-B"));
});
test("S09 AC2 AC3 should issue only one deletion and keep target locked when a transaction is pending", async ({
  page,
}) => {
  await page.evaluate(() => {
    const state = { release: false, writes: 0, committed: false };
    Object.assign(window, { pm06Pending: state });
    const remove = IDBObjectStore.prototype.delete;
    IDBObjectStore.prototype.delete = function (...args) {
      const request = remove.apply(this, args);
      if (this.name !== "programs") return request;
      state.writes += 1;
      this.transaction.addEventListener("complete", () => {
        state.committed = true;
      });
      const deadline = performance.now() + 15000;
      const pump = () => {
        if (!state.release && performance.now() < deadline)
          this.count().addEventListener("success", pump);
      };
      pump();
      return request;
    };
  });
  try {
    await confirmDelete(page, true);
    await expect(removeButton(page)).toBeDisabled();
    await expect(editor(page).getByLabel("편집할 프로그램", { exact: true })).toBeDisabled();
    await removeButton(page).evaluate((element) => (element as HTMLButtonElement).click());
    await page.keyboard.press("Escape");
    await assertDraft(page);
    await expect(page.locator("tbody tr")).toHaveCount(2);
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { pm06Pending: { writes: number; committed: boolean } })
            .pm06Pending,
      ),
    ).toMatchObject({ writes: 1, committed: false });
  } finally {
    await page.evaluate(() => {
      (window as unknown as { pm06Pending: { release: boolean } }).pm06Pending.release = true;
    });
  }
  await expect(editor(page)).toHaveCount(0);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  expect((await records(page)).map((record) => record.programName)).toEqual(["DELETE-B"]);
});
