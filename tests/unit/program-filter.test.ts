import { describe, expect, it } from "vitest";
import type { ProgramRecord } from "../../src/domain/program";
import { filterPrograms, type ProgramFilter } from "../../src/domain/program-filter";

const records: readonly Readonly<ProgramRecord>[] = Object.freeze(
  [
    {
      id: "3",
      module: "LE",
      programName: "ORDER LIST",
      owner: "Alice",
      changeType: "신규",
      status: "개발 중",
    },
    {
      id: "1",
      module: "FI",
      programName: "ORDER.*",
      owner: "",
      changeType: "수정",
      status: "개발 대기",
    },
    {
      id: "4",
      module: "LE",
      programName: "ORDER DETAIL",
      owner: "Alice",
      changeType: "수정",
      status: "개발 중",
    },
    {
      id: "2",
      module: "FI",
      programName: "INVOICE",
      owner: "Bob",
      changeType: "신규",
      status: "개발 완료",
    },
    {
      id: "5",
      module: "LE",
      programName: "ORDER OTHER",
      owner: "Bob",
      changeType: "수정",
      status: "개발 중",
    },
    {
      id: "6",
      module: "LE",
      programName: "ORDER WAIT",
      owner: "Alice",
      changeType: "수정",
      status: "개발 대기",
    },
    {
      id: "7",
      module: "FI",
      programName: "ORDER FI",
      owner: "Alice",
      changeType: "수정",
      status: "개발 중",
    },
    {
      id: "8",
      module: "LE",
      programName: "OTHER",
      owner: "Alice",
      changeType: "수정",
      status: "개발 중",
    },
  ].map((record) =>
    Object.freeze({
      ...record,
      status: record.status as ProgramRecord["status"],
      plannedStartDate: null,
      plannedEndDate: null,
      actualCompletionDate: null,
      transferDate: null,
    }),
  ),
);
const ids = (conditions: Readonly<ProgramFilter>) =>
  filterPrograms(records, conditions).map((record) => record.id);

describe("PM-04 D33", () => {
  it.each([
    ["  fI  ", ["1", "2", "7"]],
    [" list ", ["3"]],
    [" ALIce ", ["3", "4", "6", "7", "8"]],
    [" 신 ", ["3", "2"]],
  ])("S01 AC1 should match each field with OR when query is %s", (query, expected) => {
    expect(ids({ query: query as string })).toEqual(expected);
  });

  it.each(["", " \t\n "])(
    "S02 AC1 should retain original order when query is blank %j",
    (query) => {
      expect(filterPrograms(records, { query })).toEqual(records);
    },
  );

  it.each([
    ["order list", ["3"]],
    ["order alice", []],
    [".*", ["1"]],
    ["[", []],
  ])("S03 AC1 should use full literal substring when query is %s", (query, expected) => {
    expect(ids({ query: query as string })).toEqual(expected);
  });

  it("S04 AC2 should AND every condition without sorting when all filters are selected", () => {
    expect(ids({ query: "order", module: "LE", owner: "Alice", status: "개발 중" })).toEqual([
      "3",
      "4",
    ]);
  });

  it.each([
    [{ module: "FI" }, ["1", "2", "7"]],
    [{ owner: "Bob" }, ["2", "5"]],
    [{ status: "개발 대기" }, ["1", "6"]],
    [{ owner: "" }, ["1"]],
    [{ module: "L" }, []],
    [{ owner: "Ali" }, []],
  ] satisfies [ProgramFilter, string[]][])(
    "S05 AC2 should select exact single value when filter is %j",
    (conditions, expected) => {
      expect(ids(conditions)).toEqual(expected);
    },
  );

  it("S06 AC3 should return no results without errors when input is empty or unmatched", () => {
    expect(filterPrograms([], { query: "order" })).toEqual([]);
    expect(ids({ query: "missing" })).toEqual([]);
    expect(ids({ module: "UNKNOWN" })).toEqual([]);
  });

  it("S07 AC3 should preserve frozen records and conditions when searching then clearing", () => {
    const before = structuredClone(records);
    const conditions = Object.freeze({ query: "order", owner: "Alice" });
    expect(ids(conditions)).toEqual(["3", "4", "6", "7"]);
    expect(records).toEqual(before);
    expect(conditions).toEqual({ query: "order", owner: "Alice" });
    expect(filterPrograms(records, {})).toEqual(before);
  });
});
