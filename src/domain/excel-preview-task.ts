import type { ProgramRecord } from "./program";
import type { previewExcel } from "./program-excel";

export type ExcelPreviewResult = Awaited<ReturnType<typeof previewExcel>>;
export type ExcelPreviewWorker = Pick<
  Worker,
  "postMessage" | "terminate" | "onmessage" | "onerror"
>;

export function startExcelPreviewTask(
  data: Uint8Array,
  existing: readonly ProgramRecord[],
  createWorker: () => ExcelPreviewWorker,
): { result: Promise<ExcelPreviewResult>; cancel: () => void } {
  void data;
  void existing;
  void createWorker;
  return { result: Promise.resolve({ rows: [], errors: [] }), cancel: () => {} };
}
