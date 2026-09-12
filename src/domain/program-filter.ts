import type { ProgramRecord, ProgramStatus } from "./program";

export interface ProgramFilter {
  query?: string;
  module?: string;
  owner?: string;
  status?: ProgramStatus;
}

export function filterPrograms(
  records: readonly Readonly<ProgramRecord>[],
  conditions: Readonly<ProgramFilter>,
): readonly Readonly<ProgramRecord>[] {
  const query = conditions.query?.trim().toLowerCase() ?? "";
  return records.filter(
    (record) =>
      (conditions.module === undefined || record.module === conditions.module) &&
      (conditions.owner === undefined || record.owner === conditions.owner) &&
      (conditions.status === undefined || record.status === conditions.status) &&
      [record.module, record.programName, record.owner, record.changeType].some((value) =>
        value.toLowerCase().includes(query),
      ),
  );
}
