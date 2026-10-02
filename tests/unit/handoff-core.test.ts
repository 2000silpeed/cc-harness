import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as core from "../../scripts/handoff-core.mjs";
const { claimHandoff, decideHandoff, prepareHandoff, receiptHandoff, validateRecord } = core;

const baseline = JSON.parse(
  readFileSync(resolve("docs/features/architecture-redesign/evidence/ar01-baseline.json"), "utf8"),
);
const validReceipt = baseline.cases.find(
  (entry: { case_id: string }) => entry.case_id === "rollover-valid",
).record;

it("AR-01 keeps pure transitions immutable and validates each successor", () => {
  const input = structuredClone(validReceipt);
  delete input.handoff_id;
  delete input.status;
  input.task.used_rollovers = 0;
  input.rollover = { requested: "fresh-session", claim: null, receipt: null };
  const prepared = prepareHandoff(null, input);
  expect(prepared.changed).toBe(true);
  expect(prepared.record.handoff_id).toBe(validReceipt.handoff_id);
  expect(decideHandoff(prepared.record).decision).toBe("ROLLOVER_READY");
  const claim = claimHandoff(prepared.record, {
    handoffId: prepared.record.handoff_id,
    executorId: "worker",
  });
  expect(claim.result.decision).toBe("CLAIMED");
  expect(claim.record.status).toBe("claimed");
  expect(prepared.record.status).toBe("prepared");
  expect(validateRecord(claim.record)).toBe(claim.record);
  const receipt = receiptHandoff(claim.record, {
    handoffId: prepared.record.handoff_id,
    executorId: "worker",
    sessionId: "session-1",
  });
  expect(receipt.result).toEqual({ decision: "RECEIPT_RECORDED", idempotent: false });
  expect(receipt.record).toEqual(validReceipt);
  expect(claim.record.rollover.receipt).toBeNull();
  expect(validateRecord(receipt.record)).toBe(receipt.record);
});

it("AR-01 rejects invalid direct transition input", () => {
  expect(() =>
    claimHandoff(validReceipt, { handoffId: validReceipt.handoff_id, executorId: "invalid id" }),
  ).toThrow("invalid claim arguments");
  expect(() =>
    receiptHandoff(validReceipt, {
      handoffId: validReceipt.handoff_id,
      executorId: "worker",
      sessionId: "pending-1",
    }),
  ).toThrow("invalid receipt arguments");
  const corrupted = structuredClone(validReceipt);
  corrupted.rollover.receipt.executor_id = "other";
  expect(() => validateRecord(corrupted)).toThrow("receipt executor does not match claim executor");
});

it("AR-01 accepts only adapter identity STOP IDs as current problems", () => {
  const stopped = baseline.cases.find(
    (entry: { case_id: string }) => entry.case_id === "active-stop",
  ).record;
  expect(decideHandoff(stopped).decision).toBe("STOP_ACTIVE");
  expect(decideHandoff(stopped, { currentProblem: "STOP_SOURCE_STALE" }).decision).toBe(
    "STOP_SOURCE_STALE",
  );
  for (const injected of ["PHASE_READY", "ROLLOVER_READY", "STOP_ACTIVE", ""]) {
    expect(() => decideHandoff(stopped, { currentProblem: injected as never })).toThrow(
      "invalid currentProblem",
    );
    expect(() =>
      claimHandoff(stopped, {
        handoffId: stopped.handoff_id,
        executorId: "worker",
        currentProblem: injected as never,
      }),
    ).toThrow("invalid currentProblem");
    expect(() =>
      receiptHandoff(validReceipt, {
        handoffId: validReceipt.handoff_id,
        executorId: "worker",
        sessionId: "session-1",
        currentProblem: injected as never,
      }),
    ).toThrow("invalid currentProblem");
  }
});
