import { expect, test, type Page } from "@playwright/test";

test.use({ actionTimeout: 1500, storageState: { cookies: [], origins: [] } });

const fixtures = [
  ["LE", "ORDER LIST", "Alice", "신규", "개발 중"],
  ["FI", "ORDER.*", "", "수정", "개발 대기"],
  ["LE", "ORDER DETAIL", "Alice", "수정", "개발 중"],
  ["FI", "INVOICE", "Bob", "신규", "개발 완료"],
  ["LE", "ORDER OTHER", "Bob", "수정", "개발 중"],
  ["LE", "ORDER WAIT", "Alice", "수정", "개발 대기"],
  ["FI", "ORDER FI", "Alice", "수정", "개발 중"],
  ["LE", "OTHER", "Alice", "수정", "개발 중"],
];

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  for (const [module, programName, owner, changeType, status] of fixtures) {
    await page.getByRole("button", { name: "프로그램 등록", exact: true }).click();
    const dialog = page.getByRole("dialog");
    for (const [label, value] of Object.entries({
      모듈: module,
      프로그램명: programName,
      담당자: owner,
      "변경 유형": changeType,
      "개발 시작 예정일": "2026-09-10",
      "개발 완료 예정일": "2026-09-12",
    }))
      await dialog.getByLabel(label, { exact: true }).fill(value);
    await dialog.getByLabel("진행 상태", { exact: true }).selectOption({ label: status });
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
  await expect(page.locator("tbody tr")).toHaveCount(fixtures.length);
});

async function names(page: Page) {
  return page.locator("tbody tr td:nth-child(2)").allTextContents();
}

async function expectRows(page: Page, expected: string[]) {
  await expect(page.locator("tbody tr td:nth-child(2)")).toHaveText(expected);
  await expect(page.locator("tbody tr svg")).toHaveCount(expected.length);
  for (const [index, name] of expected.entries()) {
    await expect(page.locator("tbody tr").nth(index).locator("svg")).toHaveAccessibleName(
      new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}, 상태 `),
    );
  }
}

test("B01 S01 S02 S03 AC1 should search all fields literally when query changes", async ({
  page,
}) => {
  const original = await names(page);
  await page.getByRole("checkbox", { name: "간트 보기", exact: true }).check();
  for (const [query, matches] of [
    ["  fI  ", ["ORDER.*", "INVOICE", "ORDER FI"]],
    [" list ", ["ORDER LIST"]],
    [" ALIce ", ["ORDER LIST", "ORDER DETAIL", "ORDER WAIT", "ORDER FI", "OTHER"]],
    [" 신 ", ["ORDER LIST", "INVOICE"]],
    ["order list", ["ORDER LIST"]],
    ["order alice", []],
    [".*", ["ORDER.*"]],
    ["[", []],
    ["   ", original],
  ] as [string, string[]][]) {
    await page.getByLabel("프로그램 검색", { exact: true }).fill(query);
    await expectRows(
      page,
      original.filter((name) => matches.includes(name)),
    );
  }
});

test("B02 S04 AC2 should share ordered rows and SVG when every condition is active", async ({
  page,
}) => {
  const original = await names(page);
  await page.getByRole("checkbox", { name: "간트 보기", exact: true }).check();
  await page.getByLabel("프로그램 검색", { exact: true }).fill("order");
  await page.getByLabel("모듈 필터", { exact: true }).selectOption({ label: "LE" });
  await page.getByLabel("담당자 필터", { exact: true }).selectOption({ label: "Alice" });
  await page.getByLabel("진행 상태 필터", { exact: true }).selectOption({ label: "개발 중" });
  await expectRows(
    page,
    original.filter((name) => ["ORDER LIST", "ORDER DETAIL"].includes(name)),
  );
});

test("B03 S05 AC2 should select unassigned owner when that option is chosen", async ({ page }) => {
  await page.getByRole("checkbox", { name: "간트 보기", exact: true }).check();
  await page.getByLabel("담당자 필터", { exact: true }).selectOption({ label: "미지정" });
  await expectRows(page, ["ORDER.*"]);
});

test("B04 S06 S07 AC3 should restore stored records when empty results are cleared", async ({
  page,
}) => {
  const original = await page.locator("tbody tr").allTextContents();
  await page.getByLabel("모듈 필터", { exact: true }).selectOption({ label: "LE" });
  await page.getByLabel("담당자 필터", { exact: true }).selectOption({ label: "Alice" });
  await page.getByLabel("진행 상태 필터", { exact: true }).selectOption({ label: "개발 중" });
  await page.getByLabel("프로그램 검색", { exact: true }).fill("NOT-FOUND");
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await expect(page.getByText(/(?:검색 결과|결과)\s*:?\s*0건/)).toBeVisible();
  await page.getByRole("button", { name: "조건 초기화", exact: true }).click();
  await expect(page.getByLabel("프로그램 검색", { exact: true })).toHaveValue("");
  for (const label of ["모듈 필터", "담당자 필터", "진행 상태 필터"])
    await expect(page.getByLabel(label, { exact: true }).locator("option:checked")).toHaveText(
      "전체",
    );
  await expect(page.locator("tbody tr")).toHaveText(original);
  await page.getByLabel("프로그램 검색", { exact: true }).fill("NOT-FOUND");
  await page.reload();
  await page.getByRole("button", { name: "조건 초기화", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveText(original);
});

test("B05 S08 AC2 should retain full-record options when results narrow to zero", async ({
  page,
}) => {
  const labels = ["모듈 필터", "담당자 필터", "진행 상태 필터"];
  const options = [];
  for (const label of labels) {
    const select = page.getByLabel(label, { exact: true });
    await expect(select).toBeVisible();
    options.push(await select.locator("option").allTextContents());
  }
  expect(options[0]).toEqual(expect.arrayContaining(["전체", "LE", "FI"]));
  expect(options[1]).toEqual(expect.arrayContaining(["전체", "Alice", "Bob", "미지정"]));
  expect(options[2]).toEqual(expect.arrayContaining(["전체", "개발 중", "개발 대기", "개발 완료"]));
  await page.getByLabel("모듈 필터", { exact: true }).selectOption({ label: "LE" });
  await page.getByLabel("프로그램 검색", { exact: true }).fill("NOT-FOUND");
  await expect(page.locator("tbody tr")).toHaveCount(0);
  for (const [index, label] of labels.entries())
    await expect(page.getByLabel(label, { exact: true }).locator("option")).toHaveText(
      options[index],
    );
});
