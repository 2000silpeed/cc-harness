import { useEffect, useRef, useState } from "react";
import { createProgramRepository } from "./data/program-repository";
import {
  createProgramDraft,
  createProgramEditDraft,
  validateProgramDraft,
  programStatuses,
  type ProgramDraft,
  type ProgramRecord,
} from "./domain/program";

const repository = createProgramRepository();
const fields: [keyof ProgramDraft, string][] = [
  ["module", "모듈"],
  ["programName", "프로그램명"],
  ["owner", "담당자"],
  ["changeType", "변경 유형"],
  ["plannedStartDate", "개발 시작 예정일"],
  ["plannedEndDate", "개발 완료 예정일"],
  ["actualCompletionDate", "실제 개발 완료일"],
  ["transferDate", "이관 예정일"],
];

export function App() {
  const [notice, setNotice] = useState("");
  const [records, setRecords] = useState<ProgramRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(createProgramDraft);
  const [editing, setEditing] = useState<ProgramRecord | null>(null);
  const [missing, setMissing] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ProgramDraft, string>>>({});
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const register = useRef<HTMLButtonElement>(null);
  const [fullValue, setFullValue] = useState<{ label: string; value: string } | null>(null);
  const valueDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (fullValue) valueDialog.current?.showModal();
  }, [fullValue]);
  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      setRecords(await repository.list());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      document.getElementById("module")?.focus();
    }
  }, [open]);
  useEffect(() => {
    const firstError = Object.keys(errors)[0];
    if (open && !saving && firstError) document.getElementById(firstError)?.focus();
  }, [errors, open, saving]);
  function close() {
    dialog.current?.close();
    setOpen(false);
    (returnFocus.current ?? register.current)?.focus();
  }
  function discardAllowed() {
    const baseline = editing ? createProgramEditDraft(editing) : createProgramDraft();
    return (
      Object.keys(baseline).every(
        (key) => draft[key as keyof ProgramDraft] === baseline[key as keyof ProgramDraft],
      ) || window.confirm("작성 중인 내용을 버릴까요?")
    );
  }
  function edit(record: ProgramRecord) {
    if (pending.current || (open && !discardAllowed())) return;
    setEditing(record);
    setDraft(createProgramEditDraft(record));
    setErrors({});
    setSaveError("");
    setMissing(false);
    setNotice("");
    returnFocus.current = document.getElementById(`edit-${record.id}`);
    setOpen(true);
  }
  function cancel() {
    if (pending.current) return;
    if (!discardAllowed()) return;
    close();
  }
  async function save() {
    if (pending.current) return;
    setSaveError("");
    const result = validateProgramDraft(draft);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    pending.current = true;
    setSaving(true);
    try {
      const record = editing
        ? await repository.update(editing.id, result.value)
        : await repository.create(result.value);
      setRecords((previous) =>
        editing
          ? previous.map((item) => (item.id === record.id ? record : item))
          : [...previous, record],
      );
      setNotice("프로그램을 저장했습니다.");
      close();
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "duplicate") {
        setSaveError(
          "중복된 모듈·프로그램명입니다. 기존 행을 수정하세요. 기존 데이터는 유지됩니다.",
        );
        setErrors({ programName: "동일한 모듈·프로그램명이 이미 있습니다." });
      } else if (error instanceof Error && "code" in error && error.code === "not-found") {
        setMissing(true);
        setSaveError("수정할 프로그램을 찾을 수 없습니다. 입력을 보관한 뒤 목록을 재조회하세요.");
      } else setSaveError("저장하지 못했습니다. 입력은 유지됩니다. 저장 버튼으로 재시도하세요.");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  return (
    <main className="workspace">
      <header className="masthead">
        <p className="eyebrow">PM / SCHEDULE LEDGER</p>
        <span className="build-label">이 브라우저에 저장</span>
      </header>
      <section className="intro" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">프로그램 관리</p>
          <h1 id="page-title">일정을 한눈에, 업무를 차분하게.</h1>
          <p className="muted">프로그램의 담당자와 개발·이관 일정을 하나의 장부에서 관리합니다.</p>
        </div>
        <button
          className="primary"
          ref={register}
          disabled={loading || loadError}
          onClick={() => {
            setEditing(null);
            setMissing(false);
            returnFocus.current = register.current;
            setDraft(createProgramDraft());
            setErrors({});
            setSaveError("");
            setNotice("");
            setOpen(true);
          }}
        >
          프로그램 등록
        </button>
      </section>
      <section className="ledger" aria-labelledby="ledger-title">
        <div className="section-heading">
          <h2 id="ledger-title">프로그램 장부</h2>
          <span className="muted">
            {loading
              ? "불러오는 중…"
              : loadError
                ? "불러오기 실패"
                : `${records.length}개 프로그램`}
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">프로그램 목록</caption>
            <thead>
              <tr>
                <th scope="col">모듈</th>
                <th scope="col">프로그램명</th>
                <th scope="col">담당자</th>
                <th scope="col">변경 유형</th>
                <th scope="col">진행 상태</th>
                <th scope="col">시작 예정</th>
                <th scope="col">완료 예정</th>
                <th scope="col">실제 완료</th>
                <th scope="col">이관 예정</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  {(
                    [
                      ["모듈", record.module],
                      ["프로그램명", record.programName],
                      ["담당자", record.owner],
                      ["변경 유형", record.changeType],
                    ] as const
                  ).map(([label, value]) => (
                    <td key={label}>
                      {value ? (
                        <button
                          className="cell-value"
                          id={label === "프로그램명" ? `edit-${record.id}` : undefined}
                          aria-label={`${label} ${label === "프로그램명" ? "수정" : "전체 보기"}: ${value}`}
                          onClick={() =>
                            label === "프로그램명" ? edit(record) : setFullValue({ label, value })
                          }
                        >
                          {value}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  ))}
                  <td>{record.status}</td>
                  <td
                    className="date-cell"
                    aria-label={record.plannedStartDate ? undefined : "시작 예정 미정"}
                  >
                    {record.plannedStartDate || "—"}
                  </td>
                  <td
                    className="date-cell"
                    aria-label={record.plannedEndDate ? undefined : "완료 예정 미정"}
                  >
                    {record.plannedEndDate || "—"}
                  </td>
                  <td
                    className="date-cell"
                    aria-label={record.actualCompletionDate ? undefined : "실제 완료 미정"}
                  >
                    {record.actualCompletionDate || "—"}
                  </td>
                  <td
                    className="date-cell"
                    aria-label={record.transferDate ? undefined : "이관 예정 미정"}
                  >
                    {record.transferDate || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!records.length && !loadError && (
          <div className="empty-state" aria-busy={loading}>
            <span className="empty-mark" aria-hidden="true">
              —
            </span>
            <h3>첫 프로그램을 위한 자리입니다.</h3>
            <p>등록한 프로그램과 일정이 이곳에 나란히 표시됩니다.</p>
            <p className="muted">브라우저 데이터를 삭제하면 저장 내용도 사라질 수 있습니다.</p>
          </div>
        )}
        {loadError && (
          <div role="alert" className="feedback">
            <p>프로그램을 불러오지 못했습니다. 저장소 접근을 확인하고 재시도하세요.</p>
            <button onClick={() => void load()} disabled={loading}>
              재시도
            </button>
          </div>
        )}
      </section>
      <p role="status" className="notice">
        {notice}
      </p>
      <footer className="muted">
        등록한 내용은 현재 브라우저에만 저장됩니다. 간트·검색·백업·오프라인 실행은 후속 단계입니다.
      </footer>
      {fullValue && (
        <dialog
          ref={valueDialog}
          className="value-dialog"
          aria-labelledby="value-title"
          onClose={() => setFullValue(null)}
        >
          <h2 id="value-title">{fullValue.label} 전체 보기</h2>
          <p>{fullValue.value}</p>
          <form method="dialog">
            <button className="primary">닫기</button>
          </form>
        </dialog>
      )}
      {open && (
        <dialog
          ref={dialog}
          className="editor"
          aria-labelledby="editor-title"
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const controls = event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]',
            );
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
          onCancel={(event) => {
            event.preventDefault();
            cancel();
          }}
        >
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <p className="eyebrow">{editing ? "EDIT PROGRAM" : "NEW PROGRAM"}</p>
            <h2 id="editor-title">{editing ? "프로그램 수정" : "프로그램 등록"}</h2>
            {editing && (
              <div className="field">
                <label htmlFor="editing-target">편집할 프로그램</label>
                <select
                  id="editing-target"
                  disabled={saving}
                  value={editing.id}
                  onChange={(event) => {
                    const next = records.find((record) => record.id === event.target.value);
                    if (next) edit(next);
                  }}
                >
                  {records.map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.module} / {record.programName}
                    </option>
                  ))}
                </select>
                <p className="full-name">{editing.programName}</p>
              </div>
            )}
            <p className="muted">
              모듈·프로그램명·진행 상태는 필수입니다. 날짜는 비워둘 수 있습니다.
            </p>
            <div className="editor-fields">
              {fields.map(([field, label]) => (
                <div className="field" key={field}>
                  <label htmlFor={field}>{label}</label>
                  <input
                    id={field}
                    value={draft[field]}
                    disabled={saving}
                    required={field === "module" || field === "programName"}
                    placeholder={field.endsWith("Date") ? "YYYY-MM-DD" : undefined}
                    aria-invalid={Boolean(errors[field])}
                    aria-describedby={errors[field] ? `${field}-error` : undefined}
                    onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}
                  />
                  {errors[field] && (
                    <p id={`${field}-error`} className="muted">
                      오류: {errors[field]}
                    </p>
                  )}
                </div>
              ))}
              <div className="field">
                <label htmlFor="status">진행 상태</label>
                <select
                  id="status"
                  value={draft.status}
                  disabled={saving}
                  aria-invalid={Boolean(errors.status)}
                  aria-describedby={errors.status ? "status-error" : undefined}
                  onChange={(event) => setDraft({ ...draft, status: event.target.value })}
                >
                  {programStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
                {errors.status && (
                  <p id="status-error" className="muted">
                    오류: {errors.status}
                  </p>
                )}
              </div>
            </div>
            {saveError && (
              <p role="alert" className="feedback">
                {saveError}
              </p>
            )}
            <div className="editor-actions">
              {missing && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    if (!discardAllowed()) return;
                    close();
                    void load();
                  }}
                >
                  목록 재조회
                </button>
              )}
              <button type="button" onClick={cancel} disabled={saving}>
                취소
              </button>
              <button className="primary" type="submit" disabled={saving}>
                저장
              </button>
            </div>
            {saving && <p role="status">저장 중…</p>}
          </form>
        </dialog>
      )}
    </main>
  );
}
