# MR-IMP-01 Red / Green evidence

## Red

- command: `npx vitest run tests/unit/harness-portability.test.ts`
- cwd: `/Users/sungwoon/ai-projects/cc-harness`
- exit: 1
- count: 46 tests, 45 passed, 1 failed
- failure: `ships a parseable adaptive-execution result example without inventing observation` expected a string but the `Adaptive Execution 결과 JSON` template did not exist.
- classification: expected unimplemented contract; not an import, syntax, or runner failure.

## Green

- command: `npx vitest run tests/unit/harness-portability.test.ts`
- cwd: `/Users/sungwoon/ai-projects/cc-harness`
- exit: 0
- count: 46 tests, 46 passed
- implementation evidence: `docs/methods/delivery-automation.md` and `docs/harness/templates.md` now define parseable routing metadata; the installer regression preserves project-owned files.
- interpretation: the test verifies literal JSON shape and installer behavior. It does not verify live profile selection, independent-agent behavior, backend model, or usage observation.

## Shape consistency cycle

- Red: `shape-red.stdout-stderr.log`, exit 1. It detected evidence-shape, counter, failure-history, and contract-hash omissions through fixed parsing tests.
- Green: `shape-green.stdout-stderr.log`, exit 0, 47/47. Lint and harness registration raw logs are `shape-lint.stdout-stderr.log` and `shape-harness.stdout-stderr.log`, both exit 0.

## Distributed-template corrective cycle

- Independent verifier found a 46/47 portability failure because a distributed template linked to excluded feature documentation.
- The link was removed. `fourth-green.stdout-stderr.log` records the focused corrective Green, exit 0 and 47/47.
