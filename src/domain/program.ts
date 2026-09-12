export type ProgramStatus = "개발 대기" | "개발 중" | "개발 완료" | "테스트 완료" | "이관 완료";
export interface ProgramDraft {
  module: string;
  programName: string;
  changeType: string;
  owner: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualCompletionDate: string;
  transferDate: string;
  status: string;
}
export type ProgramInput = Omit<
  ProgramDraft,
  "status" | "plannedStartDate" | "plannedEndDate" | "actualCompletionDate" | "transferDate"
> & {
  status: ProgramStatus;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualCompletionDate: string | null;
  transferDate: string | null;
};
export type ProgramRecord = ProgramInput & { id: string };
export function createProgramEditDraft(record: ProgramRecord): ProgramDraft {
  return {
    module: record.module,
    programName: record.programName,
    changeType: record.changeType,
    owner: record.owner,
    plannedStartDate: record.plannedStartDate ?? "",
    plannedEndDate: record.plannedEndDate ?? "",
    actualCompletionDate: record.actualCompletionDate ?? "",
    transferDate: record.transferDate ?? "",
    status: record.status,
  };
}
export type ValidationResult =
  | { ok: true; value: ProgramInput }
  | { ok: false; fieldErrors: Partial<Record<keyof ProgramDraft, string>> };
export function createProgramDraft(): ProgramDraft {
  return {
    module: "",
    programName: "",
    changeType: "",
    owner: "",
    plannedStartDate: "",
    plannedEndDate: "",
    actualCompletionDate: "",
    transferDate: "",
    status: "개발 대기",
  };
}
export const programStatuses: ProgramStatus[] = [
  "개발 대기",
  "개발 중",
  "개발 완료",
  "테스트 완료",
  "이관 완료",
];
export function validateProgramDraft(draft: ProgramDraft): ValidationResult {
  const fieldErrors: Partial<Record<keyof ProgramDraft, string>> = {};
  const module = draft.module.trim().toUpperCase();
  const programName = draft.programName.trim().toUpperCase();
  if (!module) fieldErrors.module = "모듈을 입력하세요.";
  if (!programName) fieldErrors.programName = "프로그램명을 입력하세요.";
  if (!programStatuses.includes(draft.status as ProgramStatus))
    fieldErrors.status = "진행 상태를 선택하세요.";
  for (const field of [
    "plannedStartDate",
    "plannedEndDate",
    "actualCompletionDate",
    "transferDate",
  ] as const) {
    const value = draft[field];
    if (
      value &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        value.startsWith("0000") ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value)
    )
      fieldErrors[field] = "올바른 날짜를 입력하세요 (YYYY-MM-DD).";
  }
  if (
    draft.plannedStartDate &&
    draft.plannedEndDate &&
    draft.plannedStartDate > draft.plannedEndDate
  )
    fieldErrors.plannedEndDate = "완료 예정일은 시작 예정일 이후여야 합니다.";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return {
    ok: true,
    value: {
      ...draft,
      module,
      programName,
      status: draft.status as ProgramStatus,
      plannedStartDate: draft.plannedStartDate || null,
      plannedEndDate: draft.plannedEndDate || null,
      actualCompletionDate: draft.actualCompletionDate || null,
      transferDate: draft.transferDate || null,
    },
  };
}
