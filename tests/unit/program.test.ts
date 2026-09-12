import { expect, it } from "vitest";
import {
  createProgramDraft,
  validateProgramDraft,
  type ProgramDraft,
} from "../../src/domain/program";

const draft = (overrides: Partial<ProgramDraft> = {}): ProgramDraft => ({
  module: "LE",
  programName: "ZGWLEJ10000",
  changeType: "",
  owner: "",
  plannedStartDate: "",
  plannedEndDate: "",
  actualCompletionDate: "",
  transferDate: "",
  status: "개발 대기",
  ...overrides,
});
it("S01 should normalize identifiers when lowercase and whitespace exist without mutating input", () => {
  const input = draft({ module: " le ", programName: " zgwlej10000 " });
  const before = { ...input };
  const result = validateProgramDraft(input);
  expect(result).toMatchObject({ ok: true, value: { module: "LE", programName: "ZGWLEJ10000" } });
  expect(input).toEqual(before);
});
it.each(["module", "programName"] as const)("S02 should reject blank required %s", (field) => {
  for (const value of ["", "   "]) {
    const result = validateProgramDraft(draft({ [field]: value }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors[field]).toEqual(expect.any(String));
  }
});
it("S03 should default only status and preserve absent optional dates", () => {
  expect(createProgramDraft()).toEqual(draft({ module: "", programName: "" }));
  expect(validateProgramDraft(draft())).toEqual({
    ok: true,
    value: {
      ...draft(),
      plannedStartDate: null,
      plannedEndDate: null,
      actualCompletionDate: null,
      transferDate: null,
    },
  });
});
it.each(["개발 대기", "개발 중", "개발 완료", "테스트 완료", "이관 완료"])(
  "S04 should preserve explicit status %s without generating dates",
  (status) => {
    expect(validateProgramDraft(draft({ status }))).toMatchObject({
      ok: true,
      value: { status, actualCompletionDate: null },
    });
  },
);
it.each(["", "알 수 없음"])("S05 should reject invalid status %s", (status) => {
  expect(validateProgramDraft(draft({ status }))).toMatchObject({
    ok: false,
    fieldErrors: { status: expect.any(String) },
  });
});
it("S06 should preserve Korean and markup-like optional text", () => {
  const owner = "이성운";
  const changeType = '<img src=x onerror="alert(1)"> ODATA 신규 개발';
  expect(validateProgramDraft(draft({ owner, changeType }))).toMatchObject({
    ok: true,
    value: { owner, changeType },
  });
});
it.each(["2027-02-29", "2026-02-30", "2026/07/10"])("S07 should reject invalid date %s", (date) => {
  expect(validateProgramDraft(draft({ actualCompletionDate: date }))).toMatchObject({
    ok: false,
    fieldErrors: { actualCompletionDate: expect.any(String) },
  });
});
it("S07 should preserve a valid leap day", () => {
  expect(validateProgramDraft(draft({ actualCompletionDate: "2028-02-29" }))).toMatchObject({
    ok: true,
    value: { actualCompletionDate: "2028-02-29" },
  });
});
it("S08 should accept equal or missing plan boundaries and reject reversed dates", () => {
  for (const end of ["", "2026-07-10", "2026-07-11"])
    expect(
      validateProgramDraft(draft({ plannedStartDate: "2026-07-10", plannedEndDate: end })).ok,
    ).toBe(true);
  expect(
    validateProgramDraft(draft({ plannedStartDate: "2026-07-10", plannedEndDate: "2026-07-09" }))
      .ok,
  ).toBe(false);
});
it.each(["2026-07-01", "2026-07-20"])(
  "S09 should preserve actual %s without changing planned dates",
  (date) => {
    expect(
      validateProgramDraft(draft({ plannedEndDate: "2026-07-10", actualCompletionDate: date })),
    ).toMatchObject({
      ok: true,
      value: { plannedEndDate: "2026-07-10", actualCompletionDate: date },
    });
  },
);
