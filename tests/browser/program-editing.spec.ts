import { expect, test, type Page } from "@playwright/test";
import type { ProgramDraft, ProgramRecord } from "../../src/domain/program";

test.use({ actionTimeout: 1500, storageState: { cookies: [], origins: [] } });

const labels: Record<keyof ProgramDraft, string> = {
  module: "모듈",
  programName: "프로그램명",
  owner: "담당자",
  changeType: "변경 유형",
  plannedStartDate: "개발 시작 예정일",
  plannedEndDate: "개발 완료 예정일",
  actualCompletionDate: "실제 개발 완료일",
  transferDate: "이관 예정일",
  status: "진행 상태",
};
const original: ProgramDraft = {
  module: "LE",
  programName: "EDIT-A",
  owner: "김담당",
  changeType: "신규",
  plannedStartDate: "2026-07-10",
  plannedEndDate: "2026-07-20",
  actualCompletionDate: "2026-07-21",
  transferDate: "2026-08-01",
  status: "개발 완료",
};
const edited: ProgramDraft = {
  module: "FI",
  programName: "EDIT-CHANGED",
  owner: "이담당",
  changeType: "변경",
  plannedStartDate: "2028-02-28",
  plannedEndDate: "2028-02-29",
  actualCompletionDate: "2028-03-02",
  transferDate: "2028-03-10",
  status: "테스트 완료",
};
const editor = (page: Page) => page.getByRole("dialog", { name: "프로그램 수정", exact: true });
const nameButton = (page: Page, name = original.programName) =>
  page
    .locator("tbody tr")
    .filter({ has: page.getByRole("button", { name: new RegExp(`프로그램명.*${name}$`) }) })
    .getByRole("button", { name: /프로그램명/ });

async function fill(page: Page, draft: Partial<ProgramDraft>) {
  for (const [key, value] of Object.entries(draft)) {
    const field = page
      .getByRole("dialog")
      .getByLabel(labels[key as keyof ProgramDraft], { exact: true });
    if (key === "status") await field.selectOption(value);
    else await field.fill(value);
  }
}
async function assertDraft(page: Page, draft: ProgramDraft) {
  for (const [key, value] of Object.entries(draft)) {
    await expect(
      editor(page).getByLabel(labels[key as keyof ProgramDraft], { exact: true }),
    ).toHaveValue(value);
  }
}
async function register(page: Page, draft = original) {
  await page.getByRole("button", { name: "프로그램 등록", exact: true }).click();
  await fill(page, draft);
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function seed(page: Page, count = 2) {
  await page.goto("/");
  for (let index = 0; index < count; index += 1) {
    await register(page, {
      ...original,
      programName: index ? `EDIT-${String(index).padStart(3, "0")}` : original.programName,
    });
  }
}
async function openEditor(page: Page, name = original.programName) {
  await nameButton(page, name).click();
  await expect(editor(page)).toBeVisible({ timeout: 1500 });
}
async function save(page: Page) {
  await editor(page)
    .getByRole("button", { name: /^(저장|재시도)$/ })
    .click();
}
async function records(page: Page): Promise<ProgramRecord[]> {
  return page.evaluate(
    () =>
      new Promise<ProgramRecord[]>((resolve, reject) => {
        const request = indexedDB.open("pm-program-tracker", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("programs", "readonly");
          const read = transaction.objectStore("programs").getAll();
          transaction.oncomplete = () => {
            database.close();
            resolve(read.result as ProgramRecord[]);
          };
          transaction.onabort = () => {
            database.close();
            reject(transaction.error);
          };
        };
      }),
  );
}
async function expectUpdate(
  page: Page,
  before: ProgramRecord[],
  name: string,
  patch: Partial<ProgramRecord>,
) {
  await expect(editor(page)).toHaveCount(0);
  expect(await records(page)).toEqual(
    before.map((record) => (record.programName === name ? { ...record, ...patch } : record)),
  );
  await expect(page.locator("tbody tr")).toHaveCount(before.length);
}

test("S02 should update only the same record when all nine fields are saved and reopened", async ({
  page,
}) => {
  await seed(page);
  const before = await records(page);
  const order = await page.locator("tbody tr").allTextContents();
  await openEditor(page);
  await assertDraft(page, original);
  await fill(page, edited);
  await save(page);
  await expectUpdate(page, before, original.programName, { ...edited, status: "테스트 완료" });
  await expect(nameButton(page, edited.programName)).toBeFocused();
  const afterOrder = await page.locator("tbody tr").allTextContents();
  expect(afterOrder.findIndex((text) => text.includes(edited.programName))).toBe(
    order.findIndex((text) => text.includes(original.programName)),
  );
  await page.reload();
  await openEditor(page, edited.programName);
  await assertDraft(page, edited);
});

test("S04 should retain draft and both records when another normalized identity conflicts", async ({
  page,
}) => {
  await seed(page);
  const before = await records(page);
  await openEditor(page);
  const draft = { ...edited, module: " le ", programName: " edit-001 " };
  await fill(page, draft);
  await save(page);
  await expect(editor(page).getByRole("alert")).toContainText(/중복|이미 등록/);
  await expect(editor(page)).toContainText(/기존.*수정|등록된.*수정/);
  const field = editor(page).getByLabel("프로그램명", { exact: true });
  await expect(field).toBeFocused();
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await assertDraft(page, draft);
  expect(await records(page)).toEqual(before);
});

test("S05 should retain a missing-id draft without recreating it when the record disappears", async ({
  page,
}) => {
  await seed(page);
  const before = await records(page);
  const target = before.find((record) => record.programName === original.programName)!;
  await openEditor(page);
  await fill(page, edited);
  await page.evaluate(
    (id) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("pm-program-tracker", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("programs", "readwrite");
          transaction.objectStore("programs").delete(id);
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onabort = () => {
            database.close();
            reject(transaction.error);
          };
        };
      }),
    target.id,
  );
  await save(page);
  await expect(editor(page).getByRole("alert")).toContainText(/없|찾을 수|삭제/);
  await expect(editor(page)).toContainText(/재조회|다시.*(조회|불러)/);
  await assertDraft(page, edited);
  expect(await records(page)).toEqual(before.filter((record) => record.id !== target.id));
});

for (const status of ["개발 대기", "개발 중", "개발 완료", "테스트 완료", "이관 완료"] as const) {
  for (const actualCompletionDate of ["2026-07-01", "2026-08-20"]) {
    test(`S06 S08 should preserve explicit dates when status becomes ${status} with ${actualCompletionDate}`, async ({
      page,
    }) => {
      await seed(page, 1);
      const before = await records(page);
      await openEditor(page);
      await fill(page, { status, actualCompletionDate });
      await save(page);
      await expectUpdate(page, before, original.programName, { status, actualCompletionDate });
      await page.reload();
      await openEditor(page);
      await assertDraft(page, { ...original, status, actualCompletionDate });
    });
  }
}
test("S07 should keep completion date null when status changes to completed", async ({ page }) => {
  await page.goto("/");
  await register(page, { ...original, status: "개발 대기", actualCompletionDate: "" });
  const before = await records(page);
  await openEditor(page);
  await fill(page, { status: "개발 완료" });
  await save(page);
  await expectUpdate(page, before, original.programName, {
    status: "개발 완료",
    actualCompletionDate: null,
  });
  await page.reload();
  await openEditor(page);
  await assertDraft(page, { ...original, actualCompletionDate: "" });
});

for (const date of ["2028-02-29", "2027-02-29", "2026-02-30", "2026/07/10"]) {
  test(`S09 should validate the calendar when actual completion is ${date}`, async ({ page }) => {
    await seed(page, 1);
    const before = await records(page);
    await openEditor(page);
    const field = editor(page).getByLabel("실제 개발 완료일", { exact: true });
    await field.fill(date);
    await save(page);
    if (date === "2028-02-29") {
      await expectUpdate(page, before, original.programName, { actualCompletionDate: date });
    } else {
      await expect(field).toHaveAttribute("aria-invalid", "true");
      await expect(field).toBeFocused();
      await expect(field).toHaveAccessibleDescription(/날짜/);
      await expect(field).toHaveValue(date);
      expect(await records(page)).toEqual(before);
    }
  });
}
for (const date of ["2026-07-10", "2026-07-11", "2026-07-09"]) {
  test(`S10 should validate planned order when completion is ${date}`, async ({ page }) => {
    await seed(page, 1);
    const before = await records(page);
    await openEditor(page);
    await fill(page, { plannedEndDate: date });
    await save(page);
    if (date < original.plannedStartDate) {
      const field = editor(page).getByLabel("개발 완료 예정일", { exact: true });
      await expect(field).toBeFocused();
      await expect(field).toHaveAttribute("aria-invalid", "true");
      await expect(field).toHaveAccessibleDescription(/이후|시작/);
      expect(await records(page)).toEqual(before);
    } else await expectUpdate(page, before, original.programName, { plannedEndDate: date });
  });
}
const dateFields = [
  "plannedStartDate",
  "plannedEndDate",
  "actualCompletionDate",
  "transferDate",
] as const;
for (const cleared of [...dateFields.map((field) => [field]), [...dateFields]]) {
  test(`S11 should clear only selected dates when ${cleared.join(",")} are erased`, async ({
    page,
  }) => {
    await seed(page, 1);
    const before = await records(page);
    await openEditor(page);
    await fill(page, Object.fromEntries(cleared.map((field) => [field, ""])));
    await save(page);
    await expectUpdate(
      page,
      before,
      original.programName,
      Object.fromEntries(cleared.map((field) => [field, null])),
    );
    await page.reload();
    for (const field of cleared) {
      await expect(
        page
          .locator("tbody tr")
          .getByRole("cell")
          .nth(5 + dateFields.indexOf(field)),
      ).toHaveText("—");
    }
    await openEditor(page);
    await assertDraft(page, {
      ...original,
      ...Object.fromEntries(cleared.map((field) => [field, ""])),
    });
  });
}
for (const field of ["module", "programName"] as const) {
  for (const value of ["", "   "]) {
    test(`S12 should reject required ${field} when value is ${JSON.stringify(value)}`, async ({
      page,
    }) => {
      await seed(page, 1);
      const before = await records(page);
      await openEditor(page);
      await fill(page, { [field]: value });
      await save(page);
      const input = editor(page).getByLabel(labels[field], { exact: true });
      await expect(input).toBeFocused();
      await expect(input).toHaveAttribute("aria-invalid", "true");
      await expect(input).toHaveAccessibleDescription(/입력/);
      expect(await records(page)).toEqual(before);
    });
  }
}
test("S12 should reject an invalid status when a tampered option is submitted", async ({
  page,
}) => {
  await seed(page, 1);
  const before = await records(page);
  await openEditor(page);
  const status = editor(page).getByLabel("진행 상태", { exact: true });
  await status.evaluate((element) => element.appendChild(new Option("잘못된 상태", "invalid")));
  await status.selectOption("invalid");
  await save(page);
  await expect(status).toHaveAttribute("aria-invalid", "true");
  await expect(status).toBeFocused();
  expect(await records(page)).toEqual(before);
});

test("S13 should preserve all draft and list values when put aborts then retry once", async ({
  page,
}) => {
  await seed(page);
  const before = await records(page);
  const rows = await page.locator("tbody").textContent();
  await openEditor(page);
  await fill(page, edited);
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name !== "programs") return put.apply(this, args);
      IDBObjectStore.prototype.put = put;
      const request = put.apply(this, args);
      this.transaction.abort();
      return request;
    };
  });
  await save(page);
  await expect(editor(page).getByRole("alert")).toContainText(/저장|다시 시도/);
  await assertDraft(page, edited);
  expect(await page.locator("tbody").textContent()).toBe(rows);
  expect(await records(page)).toEqual(before);
  await expect(page.getByRole("status").filter({ hasText: /저장.*완료|수정.*완료/ })).toHaveCount(
    0,
  );
  await editor(page).getByLabel("담당자", { exact: true }).focus();
  await expect(editor(page).getByRole("alert")).toBeVisible();
  await save(page);
  await expectUpdate(page, before, original.programName, { ...edited, status: "테스트 완료" });
});

test("S14 should lock editing and commit only once when a real write remains pending", async ({
  page,
}) => {
  await seed(page);
  const before = await records(page);
  await openEditor(page);
  await fill(page, edited);
  await page.evaluate(() => {
    const state = { release: false, writes: 0, committed: false };
    Object.assign(window, { pm02Pending: state });
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      const request = put.apply(this, args);
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
    await save(page);
    const submit = editor(page).getByRole("button", { name: /저장/ });
    const cancel = editor(page).getByRole("button", { name: "취소", exact: true });
    await expect(submit).toBeDisabled();
    await expect(cancel).toBeDisabled();
    await expect(editor(page).getByLabel("편집할 프로그램", { exact: true })).toBeDisabled();
    for (const label of Object.values(labels))
      await expect(editor(page).getByLabel(label, { exact: true })).toBeDisabled();
    await submit.evaluate((element) => (element as HTMLButtonElement).click());
    await cancel.evaluate((element) => (element as HTMLButtonElement).click());
    await page.keyboard.press("Escape");
    await assertDraft(page, edited);
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { pm02Pending: { writes: number; committed: boolean } })
            .pm02Pending,
      ),
    ).toMatchObject({ writes: 1, committed: false });
  } finally {
    await page.evaluate(() => {
      (window as unknown as { pm02Pending: { release: boolean } }).pm02Pending.release = true;
    });
  }
  await expectUpdate(page, before, original.programName, { ...edited, status: "테스트 완료" });
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { pm02Pending: { writes: number; committed: boolean } }).pm02Pending,
    ),
  ).toMatchObject({ writes: 1, committed: true });
});

for (const exit of ["취소", "Escape"]) {
  for (const restored of [false, true]) {
    test(`S15 should close without confirmation when ${restored ? "restored" : "unchanged"} draft exits by ${exit}`, async ({
      page,
    }) => {
      await seed(page, 1);
      const before = await records(page);
      await openEditor(page);
      let confirmations = 0;
      page.on("dialog", async (dialog) => {
        confirmations += 1;
        await dialog.dismiss();
      });
      if (restored) {
        await fill(page, edited);
        await fill(page, original);
      }
      if (exit === "Escape") await page.keyboard.press("Escape");
      else await editor(page).getByRole("button", { name: "취소", exact: true }).click();
      await expect(editor(page)).toHaveCount(0);
      expect(confirmations).toBe(0);
      await expect(nameButton(page)).toBeFocused();
      expect(await records(page)).toEqual(before);
    });
  }
  test(`S16 should retain on decline and discard on acceptance when dirty draft exits by ${exit}`, async ({
    page,
  }) => {
    await seed(page, 1);
    const before = await records(page);
    await openEditor(page);
    await fill(page, edited);
    for (const accept of [false, true]) {
      const confirmation = page.waitForEvent("dialog").then(async (dialog) => {
        expect(dialog.type()).toBe("confirm");
        if (accept) await dialog.accept();
        else await dialog.dismiss();
      });
      if (exit === "Escape") await page.keyboard.press("Escape");
      else await editor(page).getByRole("button", { name: "취소", exact: true }).click();
      await confirmation;
      if (!accept) await assertDraft(page, edited);
    }
    await expect(editor(page)).toHaveCount(0);
    await expect(nameButton(page)).toBeFocused();
    expect(await records(page)).toEqual(before);
  });
}

test("S17 should preserve or switch target according to confirmation when a dirty draft selects B", async ({
  page,
}) => {
  await seed(page);
  const before = await records(page);
  await openEditor(page);
  const selector = editor(page).getByLabel("편집할 프로그램", { exact: true });
  const originalSelection = await selector.inputValue();
  const target = selector.getByRole("option").filter({ hasText: "EDIT-001" });
  await expect(target).toContainText("LE");
  const targetValue = await target.getAttribute("value");
  expect(targetValue).not.toBeNull();
  await fill(page, edited);
  for (const accept of [false, true]) {
    const confirmation = page.waitForEvent("dialog").then(async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      if (accept) await dialog.accept();
      else await dialog.dismiss();
    });
    await selector.selectOption(targetValue!);
    await confirmation;
    if (!accept) {
      await expect(selector).toHaveValue(originalSelection);
      await assertDraft(page, edited);
    } else {
      await expect(selector).toHaveValue(targetValue!);
      await assertDraft(page, { ...original, programName: "EDIT-001" });
    }
  }
  expect(await records(page)).toEqual(before);
});

for (const width of [390, 768, 1440]) {
  test(`S18 should trap keyboard focus and expose the full name when editing at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const programName = "LONG_PROGRAM_".repeat(12);
    await register(page, { ...original, programName });
    const trigger = nameButton(page, programName);
    await trigger.focus();
    await trigger.press("Enter");
    await expect(editor(page)).toBeVisible({ timeout: 1500 });
    await expect(editor(page).getByLabel("모듈", { exact: true })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`editing-${width}.png`), fullPage: true });
    await expect(editor(page).getByLabel("프로그램명", { exact: true })).toHaveValue(programName);
    await expect(
      editor(page).getByText(programName, { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    const focusable = editor(page).locator(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]',
    );
    await focusable.last().focus();
    await page.keyboard.press("Tab");
    await expect(focusable.first()).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(focusable.last()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(editor(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}

test("S19 should preserve order and every other record when editing the middle of 100 UI registrations", async ({
  page,
}) => {
  test.setTimeout(180000);
  await seed(page, 100);
  const before = await records(page);
  const rows = page.locator("tbody tr");
  const beforeRows = await rows.allTextContents();
  const targetName = await rows
    .nth(49)
    .getByRole("button", { name: /프로그램명/ })
    .innerText();
  await openEditor(page, targetName);
  await fill(page, { owner: "중간 행 수정" });
  await save(page);
  await expectUpdate(page, before, targetName, { owner: "중간 행 수정" });
  const afterRows = await rows.allTextContents();
  expect(afterRows.filter((_, index) => index !== 49)).toEqual(
    beforeRows.filter((_, index) => index !== 49),
  );
  await expect(rows.nth(49)).toContainText(targetName);
  await expect(rows.nth(49)).toContainText("중간 행 수정");
  await page.reload();
  await expect(rows).toHaveCount(100);
  expect(await records(page)).toEqual(
    before.map((record) =>
      record.programName === targetName ? { ...record, owner: "중간 행 수정" } : record,
    ),
  );
  for (let index = 0; index < 100; index += 1) {
    await expect(rows.nth(index).getByRole("cell")).toHaveCount(9);
    expect((await rows.nth(index).boundingBox())!.height).toBe(48);
  }
});
