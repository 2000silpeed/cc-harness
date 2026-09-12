import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IDBFactory } from "fake-indexeddb";
import { App } from "../../src/App";

describe("PM-00 bootstrap", () => {
  it("renders the empty ledger without invented program data", () => {
    const html = renderToStaticMarkup(createElement(App));
    expect(html).toContain("프로그램 등록");
    expect(html).toContain("첫 프로그램을 위한 자리");
    expect(html).not.toContain("ZGWLEJ10000");
  });
  it("provides an isolated IndexedDB test boundary", async () => {
    const factory = new IDBFactory();
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open("pm-bootstrap-test", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("probe");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("probe", "readwrite");
        transaction.objectStore("probe").put("ready", "status");
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      const value = await new Promise<unknown>((resolve, reject) => {
        const request = database.transaction("probe").objectStore("probe").get("status");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      expect(value).toBe("ready");
    } finally {
      database.close();
    }
  });
});
