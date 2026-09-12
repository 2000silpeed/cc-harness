import { validateProgramDraft, type ProgramDraft, type ProgramRecord } from "./program";

export function validateBackupRecords(records: unknown): ProgramRecord[] {
  if (!Array.isArray(records)) throw new Error("백업 프로그램 목록 형식이 올바르지 않습니다.");
  const ids = new Set<string>();
  const identities = new Set<string>();
  return Array.from(records, (record: unknown) => {
    if (!record || typeof record !== "object" || Array.isArray(record))
      throw new Error("백업 프로그램 형식이 올바르지 않습니다.");
    const source = record as Record<string, unknown>;
    if (typeof source.id !== "string" || !source.id.trim())
      throw new Error("백업 프로그램 id가 올바르지 않습니다.");
    const draft = {} as ProgramDraft;
    for (const field of ["module", "programName", "changeType", "owner", "status"] as const) {
      if (typeof source[field] !== "string") throw new Error("백업 필드 형식 오류입니다.");
      draft[field] = source[field];
    }
    for (const field of [
      "plannedStartDate",
      "plannedEndDate",
      "actualCompletionDate",
      "transferDate",
    ] as const) {
      if (source[field] !== null && typeof source[field] !== "string")
        throw new Error("백업 날짜 형식 오류입니다.");
      draft[field] = source[field] ?? "";
    }
    const result = validateProgramDraft(draft);
    if (!result.ok) throw new Error("백업 프로그램 값이 올바르지 않습니다.");
    const identity = JSON.stringify([result.value.module, result.value.programName]);
    if (ids.has(source.id) || identities.has(identity))
      throw new Error("백업에 중복 프로그램이 있습니다.");
    ids.add(source.id);
    identities.add(identity);
    return { ...result.value, id: source.id };
  });
}

export function createProgramBackup(records: readonly ProgramRecord[], exportedAt: string): string {
  const text = JSON.stringify({ version: 1, exportedAt, programs: validateBackupRecords(records) });
  parseProgramBackup(text);
  return text;
}

export function parseProgramBackup(text: string): ProgramRecord[] {
  const source: unknown = JSON.parse(text);
  if (!source || typeof source !== "object" || Array.isArray(source))
    throw new Error("백업 파일 형식이 올바르지 않습니다.");
  const backup = source as Record<string, unknown>;
  if (backup.version !== 1) throw new Error("지원하지 않는 백업 버전입니다.");
  const timestamp = backup.exportedAt;
  if (
    typeof timestamp !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(timestamp) ||
    !Number.isFinite(Date.parse(timestamp)) ||
    new Date(timestamp).toISOString() !== timestamp
  )
    throw new Error("백업 시각이 올바르지 않습니다.");
  return validateBackupRecords(backup.programs);
}
