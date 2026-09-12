import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  startExcelPreviewTask,
  type ExcelPreviewWorker,
} from "../../src/domain/excel-preview-task";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup() {
  const worker: ExcelPreviewWorker = {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: null,
    onerror: null,
  };
  const data = new Uint8Array([80, 75]);
  const existing = Object.freeze([]);
  const createWorker = vi.fn(() => worker);
  const task = startExcelPreviewTask(data, existing, createWorker);
  const settled = vi.fn();
  void task.result.then(settled);
  const message = worker.onmessage;
  const error = worker.onerror;
  const reply = (value: unknown) =>
    message?.call(worker as Worker, { data: value } as MessageEvent);
  const fail = () => error?.call(worker as Worker, { message: "worker crashed" } as ErrorEvent);
  return { worker, data, existing, createWorker, task, settled, reply, fail };
}
const success = { rows: [], errors: [{ row: 2, field: "담당자", message: "수식 오류" }] };

it("W01 AC4 should dispatch immutable input when starting a dedicated worker task", () => {
  const context = setup();
  expect(context.createWorker).toHaveBeenCalledExactlyOnceWith();
  expect(context.worker.postMessage).toHaveBeenCalledExactlyOnceWith({
    data: context.data,
    existing: context.existing,
  });
  expect(context.data).toEqual(new Uint8Array([80, 75]));
  expect(context.existing).toEqual([]);
  context.task.cancel();
});
it("W02 AC4 should time out exactly at five seconds when worker is silent", async () => {
  const context = setup();
  await vi.advanceTimersByTimeAsync(4999);
  expect(context.settled).not.toHaveBeenCalled();
  expect(context.worker.terminate).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(context.settled).toHaveBeenCalledExactlyOnceWith({
    rows: [],
    errors: [{ row: 0, field: "파일", message: expect.stringMatching(/시간.*초과|시간 초과/) }],
  });
  expect(context.worker.terminate).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
it("W03 AC4 should cancel and terminate once when cancellation repeats", async () => {
  const context = setup();
  context.task.cancel();
  context.task.cancel();
  expect(await context.task.result).toEqual({
    rows: [],
    errors: [{ row: 0, field: "파일", message: expect.stringMatching(/취소/) }],
  });
  expect(context.worker.terminate).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
it("W04 AC4 should report a file error and terminate when worker crashes", async () => {
  const context = setup();
  context.fail();
  expect(await context.task.result).toEqual({
    rows: [],
    errors: [{ row: 0, field: "파일", message: expect.stringMatching(/오류|실패/) }],
  });
  expect(context.worker.terminate).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
it("W05 AC1 AC4 should forward parsing results and clean up when worker responds", async () => {
  const context = setup();
  context.reply(success);
  expect(await context.task.result).toEqual(success);
  expect(context.worker.terminate).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
  expect(context.worker.onmessage).toBeNull();
  expect(context.worker.onerror).toBeNull();
});
it.each(["cancel", "timeout", "error", "success"])(
  "W06 AC4 should ignore queued late messages and errors when task ended by %s",
  async (ending) => {
    const context = setup();
    if (ending === "cancel") context.task.cancel();
    if (ending === "timeout") await vi.advanceTimersByTimeAsync(5000);
    if (ending === "error") context.fail();
    if (ending === "success") context.reply(success);
    const initial = await context.task.result;
    context.reply({ rows: [], errors: [] });
    context.fail();
    context.task.cancel();
    await vi.advanceTimersByTimeAsync(10000);
    expect(await context.task.result).toEqual(initial);
    expect(context.settled).toHaveBeenCalledExactlyOnceWith(initial);
    expect(context.worker.terminate).toHaveBeenCalledTimes(1);
    expect(context.worker.onmessage).toBeNull();
    expect(context.worker.onerror).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  },
);
