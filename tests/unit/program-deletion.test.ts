import { afterEach, expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { createProgramRepository, type ProgramRepository } from "../../src/data/program-repository";
import type { ProgramRecord } from "../../src/domain/program";

const first: ProgramRecord = {
  id: "saved-a",
  module: "LE",
  programName: "DELETE-A",
  owner: "담당",
  changeType: "신규",
  status: "개발 대기",
  plannedStartDate: null,
  plannedEndDate: null,
  actualCompletionDate: null,
  transferDate: null,
};
const second = { ...first, id: "saved-b", programName: "DELETE-B" };
const stores: ProgramRepository[] = [];
function repository(factory = new IDBFactory()) {
  const store = createProgramRepository({ factory, databaseName: "pm-06" });
  stores.push(store);
  return store;
}
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(stores.splice(0).map((store) => store.close()));
});

it("S01 AC2 should remove only the saved id when deleting among two records and reopening", async () => {
  const factory = new IDBFactory();
  const store = repository(factory);
  await store.replaceAll([first, second]);
  await expect(store.delete(first.id)).resolves.toBeUndefined();
  expect(await store.list()).toEqual([second]);
  await store.close();
  expect(await repository(factory).list()).toEqual([second]);
});
it("S02 AC3 should reject not-found and preserve records when the id is absent then permit retry", async () => {
  const store = repository();
  await store.replaceAll([first, second]);
  await expect(store.delete("absent")).rejects.toMatchObject({ code: "not-found" });
  expect(await store.list()).toEqual([first, second]);
  await store.delete(first.id);
  expect(await store.list()).toEqual([second]);
});
it("S03 AC3 should rollback a successful delete request when its transaction aborts then retry", async () => {
  const store = repository();
  await store.replaceAll([first, second]);
  let requestSucceeded = false;
  const remove = IDBObjectStore.prototype.delete;
  vi.spyOn(IDBObjectStore.prototype, "delete").mockImplementation(function (
    this: IDBObjectStore,
    key,
  ) {
    const request = remove.call(this, key);
    request.addEventListener("success", () => {
      requestSucceeded = true;
      this.transaction.abort();
    });
    return request;
  });
  await expect(store.delete(first.id)).rejects.toMatchObject({ code: "storage" });
  expect(requestSucceeded).toBe(true);
  vi.restoreAllMocks();
  expect(await store.list()).toEqual([first, second]);
  await store.delete(first.id);
  expect(await store.list()).toEqual([second]);
});
it("S04 AC2 should resolve only after transaction complete when the delete request succeeds", async () => {
  const store = repository();
  await store.replaceAll([first, second]);
  const events: string[] = [];
  const remove = IDBObjectStore.prototype.delete;
  vi.spyOn(IDBObjectStore.prototype, "delete").mockImplementation(function (
    this: IDBObjectStore,
    key,
  ) {
    const request = remove.call(this, key);
    request.addEventListener("success", () => events.push("request-success"));
    this.transaction.addEventListener("complete", () => events.push("complete"));
    return request;
  });
  await store.delete(first.id).then(() => events.push("resolved"));
  expect(events).toEqual(["request-success", "complete", "resolved"]);
});
it("S05 AC2 should retain the invocation id when the caller changes its selected id while queued", async () => {
  const store = repository();
  await store.replaceAll([first, second]);
  let selectedId = first.id;
  const queuedRead = store.list();
  const deletion = store.delete(selectedId);
  selectedId = second.id;
  await Promise.all([queuedRead, deletion]);
  expect(selectedId).toBe(second.id);
  expect(await store.list()).toEqual([second]);
});
