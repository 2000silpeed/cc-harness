import { afterEach, expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import {
  createProgramEditDraft,
  validateProgramDraft,
  type ProgramInput,
} from "../../src/domain/program";
import { createProgramRepository, type ProgramRepository } from "../../src/data/program-repository";

const input: ProgramInput = {
  module: "LE",
  programName: "ZGWLEJ10000",
  owner: "이성운",
  changeType: "ODATA 신규 개발",
  status: "테스트 완료",
  plannedStartDate: null,
  plannedEndDate: "2026-07-01",
  actualCompletionDate: "2026-07-10",
  transferDate: "2026-09-06",
};
const stores: ProgramRepository[] = [];
function setup(factory = new IDBFactory()) {
  const createId = vi.fn(() => crypto.randomUUID());
  const store = createProgramRepository({ factory, databaseName: "pm-02-isolated-test", createId });
  stores.push(store);
  return { store, factory, createId };
}
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(stores.splice(0).map((store) => store.close()));
});
it("S01 should copy all editing fields without mutating the record when dates are nullable", () => {
  const record = { ...input, id: "original" };
  const before = { ...record };
  const draft = createProgramEditDraft(record);
  expect(draft).toEqual({ ...input, plannedStartDate: "" });
  draft.owner = "다른 사람";
  expect(record).toEqual(before);
});
it("S02 should replace only the same id and persist all fields when updated and reopened", async () => {
  const { store, factory, createId } = setup();
  const record = await store.create(input);
  const other = await store.create({ ...input, programName: "OTHER" });
  const edited: ProgramInput = {
    ...input,
    module: "MM",
    programName: "CHANGED",
    owner: "새 담당자",
    changeType: "수정 개발",
    status: "개발 중",
    plannedStartDate: "2026-08-01",
    plannedEndDate: "2026-08-02",
    actualCompletionDate: null,
    transferDate: null,
  };
  expect(await store.update(record.id, edited)).toEqual({ ...edited, id: record.id });
  expect(createId).toHaveBeenCalledTimes(2);
  await store.close();
  const records = await setup(factory).store.list();
  expect(records).toHaveLength(2);
  expect(records).toEqual(expect.arrayContaining([{ ...edited, id: record.id }, other]));
});
it("S03 should allow its own normalized key when updating", async () => {
  const { store } = setup();
  const record = await store.create(input);
  const result = validateProgramDraft({
    ...input,
    module: " le ",
    programName: " zgwlej10000 ",
    plannedStartDate: "",
    plannedEndDate: input.plannedEndDate!,
    actualCompletionDate: input.actualCompletionDate!,
    transferDate: input.transferDate!,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected valid fixture");
  expect(await store.update(record.id, result.value)).toEqual(record);
  expect(await store.list()).toEqual([record]);
});
it("S04 should reject another record's key and preserve every record when keys collide", async () => {
  const { store } = setup();
  const record = await store.create(input);
  await store.create({ ...input, programName: "OTHER" });
  const before = await store.list();
  await expect(
    store.update(record.id, { ...input, programName: "OTHER", owner: "변경" }),
  ).rejects.toMatchObject({ code: "duplicate" });
  expect(await store.list()).toEqual(before);
});
it("S05 should not insert a missing id when update is requested", async () => {
  const { store } = setup();
  const record = await store.create(input);
  await expect(store.update("missing", { ...input, programName: "NEW" })).rejects.toMatchObject({
    code: "not-found",
  });
  expect(await store.list()).toEqual([record]);
});
it("S13 should preserve stored values after abort and succeed on retry", async () => {
  const { store } = setup();
  const record = await store.create(input);
  const put = IDBObjectStore.prototype.put;
  vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
    this: IDBObjectStore,
    ...args: Parameters<typeof put>
  ) {
    const request = put.apply(this, args);
    this.transaction.abort();
    return request;
  });
  await expect(store.update(record.id, { ...input, owner: "변경" })).rejects.toMatchObject({
    code: "storage",
  });
  expect(await store.list()).toEqual([record]);
  vi.restoreAllMocks();
  expect(await store.update(record.id, { ...input, owner: "변경" })).toEqual({
    ...record,
    owner: "변경",
  });
});
it("S13 should return storage error when opening the database fails", async () => {
  const factory = new IDBFactory();
  vi.spyOn(factory, "open").mockImplementation(() => {
    throw new DOMException("Unavailable", "SecurityError");
  });
  await expect(setup(factory).store.update("existing", input)).rejects.toMatchObject({
    code: "storage",
  });
});
it("S19 should preserve 99 other records when one of 100 programs is updated", async () => {
  const { store } = setup();
  const original = [];
  for (let index = 0; index < 100; index += 1)
    original.push(await store.create({ ...input, programName: `PROGRAM-${index}` }));
  const target = original[49];
  const updated = await store.update(target.id, { ...target, owner: "변경" });
  expect(updated).toEqual({ ...target, owner: "변경" });
  const records = await store.list();
  expect(records).toHaveLength(100);
  expect(records).toEqual(
    expect.arrayContaining(original.map((record) => (record.id === target.id ? updated : record))),
  );
});
