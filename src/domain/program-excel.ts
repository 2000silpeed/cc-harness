import type { ProgramInput, ProgramRecord } from "./program";

export const excelHeaders = [
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
export function createExcelTemplate(): Uint8Array {
  return new Uint8Array();
}
export async function previewExcel(
  data: Uint8Array,
  existing: readonly ProgramRecord[],
): Promise<{ rows: ProgramInput[]; errors: { row: number; field: string; message: string }[] }> {
  void data;
  void existing;
  return { rows: [], errors: [] };
}
