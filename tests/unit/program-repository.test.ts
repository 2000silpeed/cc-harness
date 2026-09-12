import { afterEach, expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { createProgramRepository, type ProgramRepository } from "../../src/data/program-repository";
import type { ProgramInput } from "../../src/domain/program";

const input: ProgramInput = {
  module: "LE",
  programName: "ZGWLEJ10000",
  status: "개발 대기",
  changeType: "ODATA 신규 개발",
  owner: "이성운",
  plannedStartDate: null,
  plannedEndDate: null,
  actualCompletionDate: "2026-07-10",
  transferDate: "2026-09-06",
};
const repositories: ProgramRepository[] = [];
function repository(factory = new IDBFactory()) {
  const store = createProgramRepository({ factory, databaseName: "pm-01-isolated-test" });
  repositories.push(store);
  return store;
}
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(repositories.splice(0).map((store) => store.close()));
});
it("S10 should persist all fields and stable id when connection reopens", async () => {
  const factory = new IDBFactory();
  const store = repository(factory);
  const record = await store.create(input);
  expect(record).toMatchObject(input);
  expect(record.id).toEqual(expect.any(String));
  await store.close();
  expect(await repository(factory).list()).toEqual([record]);
});
it("S11 should reject duplicate identity without changing existing data", async () => {
  const store = repository();
  const record = await store.create(input);
  await expect(store.create({ ...input, owner: "다른 사람" })).rejects.toMatchObject({
    code: "duplicate",
  });
  expect(await store.list()).toEqual([record]);
});
it("S12 should allow distinct composite keys without delimiter collisions", async () => {
  const store = repository();
  const records = [];
  for (const [module, programName] of [
    ["LE", "A"],
    ["MM", "A"],
    ["LE", "B"],
    ["A:B", "C"],
    ["A", "B:C"],
  ])
    records.push(await store.create({ ...input, module, programName }));
  expect(await store.list()).toEqual(expect.arrayContaining(records));
  expect(await store.list()).toHaveLength(5);
});
it("S13 should commit exactly one concurrent duplicate", async () => {
  const store = repository();
  const results = await Promise.allSettled([store.create(input), store.create(input)]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((result) => result.status === "rejected")).toMatchObject([
    { reason: { code: "duplicate" } },
  ]);
  expect(await store.list()).toHaveLength(1);
});
it("S14 should classify database open failure as storage", async () => {
  const factory = new IDBFactory();
  vi.spyOn(factory, "open").mockImplementation(() => {
    throw new DOMException("blocked", "SecurityError");
  });
  await expect(repository(factory).create(input)).rejects.toMatchObject({ code: "storage" });
});
it("S14 should preserve existing records when transaction aborts", async () => {
  const store = repository();
  const record = await store.create(input);
  const add = IDBObjectStore.prototype.add;
  vi.spyOn(IDBObjectStore.prototype, "add").mockImplementation(function (
    this: IDBObjectStore,
    ...args: Parameters<typeof add>
  ) {
    const request = add.apply(this, args);
    this.transaction.abort();
    return request;
  });
  await expect(store.create({ ...input, programName: "NEW" })).rejects.toMatchObject({
    code: "storage",
  });
  vi.restoreAllMocks();
  expect(await store.list()).toEqual([record]);
});
it("S15 should reject list failures rather than return empty data", async () => {
  const factory = new IDBFactory();
  vi.spyOn(factory, "open").mockImplementation(() => {
    throw new DOMException("blocked", "SecurityError");
  });
  await expect(repository(factory).list()).rejects.toMatchObject({ code: "storage" });
});
