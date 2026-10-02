export interface HandoffRecord {
  handoff_id: string;
  status: string;
  rollover: {
    claim: { executor_id: string } | null;
    receipt: { executor_id: string; session_id: string } | null;
  };
  [key: string]: unknown;
}

export interface HandoffDecision {
  decision: string;
  [key: string]: unknown;
}

export type CurrentProblem =
  | "STOP_SOURCE_UNAVAILABLE"
  | "STOP_SOURCE_STALE"
  | "STOP_DIRTY_STALE"
  | "STOP_CONTRACT_STALE"
  | "STOP_APPROVAL_STALE"
  | "STOP_EVIDENCE_STALE"
  | "STOP_REFERENCE_UNSAFE";

export function validateSemantic<T>(input: T): T;
export function validateRecord<T extends HandoffRecord>(record: T): T;
export function canonical(value: unknown): string;
export function digest(value: unknown): string;
export function checkReferenceLineage(previous: HandoffRecord, input: unknown): void;
export function decideHandoff(
  record: HandoffRecord,
  context?: { currentProblem?: CurrentProblem | null; sessionId?: string },
): HandoffDecision;
export function prepareHandoff(
  previous: HandoffRecord | null,
  input: unknown,
): { record: HandoffRecord; changed: boolean };
export function claimHandoff(
  record: HandoffRecord,
  context?: { handoffId?: string; executorId?: string; currentProblem?: CurrentProblem | null },
): { record: HandoffRecord; result: HandoffDecision; changed: boolean };
export function receiptHandoff(
  record: HandoffRecord,
  context?: {
    handoffId?: string;
    executorId?: string;
    sessionId?: string;
    currentProblem?: CurrentProblem | null;
  },
): { record: HandoffRecord; result: HandoffDecision; changed: boolean };
