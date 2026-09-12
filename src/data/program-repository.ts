import type { ProgramInput, ProgramRecord } from "../domain/program";
import { validateBackupRecords } from "../domain/program-backup";

export interface ProgramRepository {
  list(): Promise<ProgramRecord[]>;
  replaceAll(records: readonly ProgramRecord[]): Promise<void>;
  create(input: ProgramInput): Promise<ProgramRecord>;
  update(id: string, input: ProgramInput): Promise<ProgramRecord>;
  delete(id: string): Promise<void>;
  close(): Promise<void>;
}
export interface ProgramStoreError extends Error {
  code: "duplicate" | "storage" | "not-found";
}
export function createProgramRepository(options?: {
  factory?: IDBFactory;
  databaseName?: string;
  createId?: () => string;
}): ProgramRepository {
  let database: IDBDatabase | undefined;
  let pending = Promise.resolve();

  function storeError(code: ProgramStoreError["code"] = "storage"): ProgramStoreError {
    return Object.assign(
      new Error(
        code === "duplicate"
          ? "같은 모듈과 프로그램명이 이미 등록되어 있습니다."
          : code === "not-found"
            ? "수정할 프로그램을 찾을 수 없습니다. 목록을 다시 조회해 주세요."
            : "프로그램 저장소에 접근하지 못했습니다. 다시 시도해 주세요.",
      ),
      { code },
    );
  }

  function enqueue<Result>(operation: () => Promise<Result>): Promise<Result> {
    const result = pending.then(operation);
    pending = result.then(
      () => {},
      () => {},
    );
    return result;
  }

  async function open(): Promise<IDBDatabase> {
    if (database) return database;
    return new Promise((resolve, reject) => {
      let failed = false;
      const fail = () => {
        failed = true;
        reject(storeError());
      };
      try {
        const request = (options?.factory ?? globalThis.indexedDB).open(
          options?.databaseName ?? "pm-program-tracker",
          1,
        );
        request.onerror = fail;
        request.onblocked = fail;
        request.onupgradeneeded = () => {
          if (failed) {
            request.transaction?.abort();
            return;
          }
          try {
            const programs = request.result.createObjectStore("programs", { keyPath: "id" });
            programs.createIndex("identity", ["module", "programName"], { unique: true });
          } catch {
            request.transaction?.abort();
            fail();
          }
        };
        request.onsuccess = () => {
          const connection = request.result;
          if (failed) {
            connection.close();
            return;
          }
          database = connection;
          connection.onversionchange = () => {
            connection.close();
            if (database === connection) database = undefined;
          };
          connection.onclose = () => {
            if (database === connection) database = undefined;
          };
          resolve(connection);
        };
      } catch {
        fail();
      }
    });
  }

  async function transact(input?: ProgramInput, id?: string): Promise<ProgramRecord[]> {
    const connection = await open();
    return new Promise((resolve, reject) => {
      let transaction: IDBTransaction | undefined;
      let records: ProgramRecord[] = [];
      let failure = storeError();
      try {
        transaction = connection.transaction("programs", input ? "readwrite" : "readonly");
        transaction.oncomplete = () => resolve(records);
        transaction.onabort = () => reject(failure);
        const programs = transaction.objectStore("programs");
        if (!input) {
          const request = programs.getAll();
          request.onsuccess = () => {
            records = request.result as ProgramRecord[];
          };
          return;
        }
        const record: ProgramRecord = {
          ...input,
          id: id ?? options?.createId?.() ?? globalThis.crypto.randomUUID(),
        };
        const write = () => {
          try {
            const identity = programs.index("identity").getKey([record.module, record.programName]);
            identity.onsuccess = () => {
              try {
                if (identity.result !== undefined && (id === undefined || identity.result !== id)) {
                  failure = storeError("duplicate");
                  transaction!.abort();
                } else {
                  const request = id === undefined ? programs.add(record) : programs.put(record);
                  request.onerror = () => {
                    if (request.error?.name === "ConstraintError")
                      failure = storeError("duplicate");
                  };
                  records = [record];
                }
              } catch {
                transaction!.abort();
              }
            };
          } catch {
            transaction!.abort();
          }
        };
        if (id === undefined) {
          write();
        } else {
          const existing = programs.get(id);
          existing.onsuccess = () => {
            if (existing.result === undefined) {
              failure = storeError("not-found");
              transaction!.abort();
            } else {
              write();
            }
          };
        }
      } catch {
        if (transaction) transaction.abort();
        else {
          connection.close();
          if (database === connection) database = undefined;
          reject(failure);
        }
      }
    });
  }

  return {
    async delete(id: string) {
      return enqueue(async () => {
        const connection = await open();
        return new Promise<void>((resolve, reject) => {
          let transaction: IDBTransaction | undefined;
          let failure = storeError();
          const abort = () => {
            try {
              transaction!.abort();
            } catch {
              reject(failure);
            }
          };
          try {
            transaction = connection.transaction("programs", "readwrite");
            transaction.oncomplete = () => resolve();
            transaction.onabort = () => reject(failure);
            const programs = transaction.objectStore("programs");
            const existing = programs.get(id);
            existing.onsuccess = () => {
              if (existing.result === undefined) {
                failure = storeError("not-found");
                abort();
                return;
              }
              try {
                programs.delete(id);
              } catch {
                abort();
              }
            };
          } catch {
            if (transaction) abort();
            else {
              connection.close();
              if (database === connection) database = undefined;
              reject(failure);
            }
          }
        });
      });
    },
    async replaceAll(records) {
      const snapshot = validateBackupRecords(records);
      return enqueue(async () => {
        const connection = await open();
        return new Promise<void>((resolve, reject) => {
          let transaction: IDBTransaction | undefined;
          try {
            transaction = connection.transaction("programs", "readwrite");
            transaction.oncomplete = () => resolve();
            transaction.onabort = () => reject(storeError());
            const programs = transaction.objectStore("programs");
            programs.clear();
            for (const record of snapshot) programs.add(record);
          } catch {
            if (transaction) {
              try {
                transaction.abort();
              } catch {
                reject(storeError());
              }
            } else {
              connection.close();
              if (database === connection) database = undefined;
              reject(storeError());
            }
          }
        });
      });
    },
    update(id, input) {
      const snapshot = { ...input };
      return enqueue(async () => (await transact(snapshot, id))[0]);
    },
    list() {
      return enqueue(() => transact());
    },
    create(input) {
      const snapshot = { ...input };
      return enqueue(async () => (await transact(snapshot))[0]);
    },
    close() {
      return enqueue(async () => {
        database?.close();
        database = undefined;
      });
    },
  };
}
