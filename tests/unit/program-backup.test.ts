import { afterEach, expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { createProgramBackup, parseProgramBackup } from "../../src/domain/program-backup";
import { createProgramRepository, type ProgramRepository } from "../../src/data/program-repository";
import type { ProgramRecord } from "../../src/domain/program";

const exportedAt = "2026-09-13T01:02:03.000Z";
const record: ProgramRecord = {
  id: "stable-id",
  module: "LE",
  programName: "ORDER",
  changeType: "신규",
  owner: "이성운",
  status: "개발 중",
  plannedStartDate: "2026-09-01",
  plannedEndDate: "2026-09-10",
  actualCompletionDate: "2026-08-31",
  transferDate: null,
};
const backup = (programs: unknown = [record]) =>
  JSON.stringify({ version: 1, exportedAt, programs });
const stores: ProgramRepository[] = [];
function repository(factory = new IDBFactory()) {
  const store = createProgramRepository({ factory, databaseName: "pm-05" });
  stores.push(store);
  return store;
}
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(stores.splice(0).map((store) => store.close()));
});

it("S01 AC1 should preserve nine fields and id when exporting all records", () => {
  const records = [record, { ...record, id: "second", programName: "OTHER" }];
  const before = structuredClone(records);
  const text = createProgramBackup(records, exportedAt);
  expect(JSON.parse(text)).toEqual({ version: 1, exportedAt, programs: records });
  expect(parseProgramBackup(text)).toEqual(records);
  expect(records).toEqual(before);
});
it("S02 AC2 should normalize identity and retain id and independent dates when parsing", () => {
  expect(
    parseProgramBackup(backup([{ ...record, module: " le ", programName: " order " }])),
  ).toEqual([record]);
});
it("S03 AC2 should allow an empty snapshot when explicitly backed up", () => {
  expect(JSON.parse(createProgramBackup([], exportedAt))).toEqual({
    version: 1,
    exportedAt,
    programs: [],
  });
  expect(parseProgramBackup(backup([]))).toEqual([]);
});
const invalid: [string, string][] = [
  ["malformed", "{"],
  ["null", "null"],
  ["array root", "[]"],
  ["missing version", JSON.stringify({ exportedAt, programs: [] })],
  ["unsupported version", JSON.stringify({ version: 2, exportedAt, programs: [] })],
  ["string version", JSON.stringify({ version: "1", exportedAt, programs: [] })],
  ["missing timestamp", JSON.stringify({ version: 1, programs: [] })],
  ["invalid timestamp", JSON.stringify({ version: 1, exportedAt: "yesterday", programs: [] })],
  ["non ISO timestamp", JSON.stringify({ version: 1, exportedAt: "09/13/2026", programs: [] })],
  [
    "impossible timestamp",
    JSON.stringify({ version: 1, exportedAt: "2026-02-30T00:00:00.000Z", programs: [] }),
  ],
  ...[null, {}, "records", [null], [1], [[]]].map((programs, index): [string, string] => [
    "unknown programs " + index,
    backup(programs),
  ]),
  ...Object.keys(record).map((field): [string, string] => {
    const missing: Record<string, unknown> = { ...record };
    delete missing[field];
    return ["missing " + field, backup([missing])];
  }),
  ...Object.keys(record).map((field): [string, string] => [
    "wrong type " + field,
    backup([{ ...record, [field]: 42 }]),
  ]),
  ...[
    { id: "" },
    { id: "   " },
    { module: " " },
    { programName: "" },
    { status: "완료" },
    { plannedStartDate: "2026-02-30" },
    { plannedEndDate: "2026-08-01" },
    { actualCompletionDate: "0000-01-01" },
    { transferDate: "2026-13-01" },
  ].map((patch, index): [string, string] => [
    "invalid record " + index,
    backup([record, { ...record, id: "next", programName: "NEXT", ...patch }]),
  ]),
  ["duplicate id", backup([record, { ...record, programName: "OTHER" }])],
  [
    "normalized duplicate key",
    backup([record, { ...record, id: "second", module: " le ", programName: " order " }]),
  ],
];
it.each(invalid)(
  "S04 AC3 should reject %s atomically when parsing unknown input",
  (_name, text) => {
    expect(() => parseProgramBackup(text)).toThrow(Error);
  },
);
it("S02 AC2 should preserve distinct composite keys when delimiters collide", () => {
  const records = [
    { ...record, module: "A:B", programName: "C" },
    { ...record, id: "two", module: "A", programName: "B:C" },
  ];
  expect(parseProgramBackup(backup(records))).toEqual(records);
});
it("S05 AC2 should replace rather than merge and persist when reopened", async () => {
  const factory = new IDBFactory();
  const store = repository(factory);
  await store.create({ ...record, programName: "ORIGINAL" });
  const replacement = [record, { ...record, id: "second", programName: "SECOND" }];
  await store.replaceAll(replacement);
  await store.close();
  expect(await repository(factory).list()).toEqual(expect.arrayContaining(replacement));
  expect(await repository(factory).list()).toHaveLength(2);
});
it("S03 AC2 should clear all records when replacing with confirmed empty backup", async () => {
  const store = repository();
  await store.create(record);
  await store.replaceAll([]);
  expect(await store.list()).toEqual([]);
});
it.each([
  [{ ...record, status: "invalid" }],
  [record, { ...record, programName: "OTHER" }],
  [record, { ...record, id: "other", module: " le ", programName: " order " }],
])(
  "S06 AC3 should preserve originals when replacement validation fails: %j",
  async (...records) => {
    const store = repository();
    const original = await store.create({ ...record, programName: "ORIGINAL" });
    await expect(store.replaceAll(records as ProgramRecord[])).rejects.toThrow(Error);
    expect(await store.list()).toEqual([original]);
  },
);
it("S07 AC3 should rollback clear and successful new write when storage aborts then retry", async () => {
  const store = repository();
  const originals = [
    await store.create({ ...record, programName: "ORIGINAL-A" }),
    await store.create({ ...record, programName: "ORIGINAL-B" }),
  ];
  let cleared = false;
  let wrote = false;
  const clear = IDBObjectStore.prototype.clear;
  vi.spyOn(IDBObjectStore.prototype, "clear").mockImplementation(function (this: IDBObjectStore) {
    const request = clear.call(this);
    request.addEventListener("success", () => {
      cleared = true;
    });
    return request;
  });
  for (const method of ["add", "put"] as const) {
    const write = IDBObjectStore.prototype[method];
    vi.spyOn(IDBObjectStore.prototype, method).mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<typeof write>
    ) {
      const request = write.apply(this, args);
      request.addEventListener("success", () => {
        wrote = true;
        this.transaction.abort();
      });
      return request;
    });
  }
  await expect(store.replaceAll([record])).rejects.toMatchObject({ code: "storage" });
  expect(cleared).toBe(true);
  expect(wrote).toBe(true);
  vi.restoreAllMocks();
  expect(await store.list()).toEqual(expect.arrayContaining(originals));
  expect(await store.list()).toHaveLength(2);
  await store.replaceAll([record]);
  expect(await store.list()).toEqual([record]);
});
