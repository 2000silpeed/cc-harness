import { expect, it } from "vitest";
import * as XLSX from "xlsx";
import { createExcelTemplate, excelHeaders, previewExcel } from "../../src/domain/program-excel";
import type { ProgramInput } from "../../src/domain/program";

const headers = [
  "모듈",
  "프로그램명",
  "담당자",
  "변경 유형",
  "진행 상태",
  "개발 시작 예정일",
  "개발 완료 예정일",
  "실제 개발 완료일",
  "이관 예정일",
];
const row = [
  " le ",
  " order ",
  "담당",
  "신규",
  "개발 중",
  "2026-09-01",
  "2026-09-10",
  "2026-08-31",
  "",
];
const expected: ProgramInput = {
  module: "LE",
  programName: "ORDER",
  owner: "담당",
  changeType: "신규",
  status: "개발 중",
  plannedStartDate: "2026-09-01",
  plannedEndDate: "2026-09-10",
  actualCompletionDate: "2026-08-31",
  transferDate: null,
};
function file(
  rows: unknown[][] = [row],
  columns = headers,
  edit?: (book: XLSX.WorkBook, sheet: XLSX.WorkSheet) => void,
): Uint8Array {
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([columns, ...rows]);
  XLSX.utils.book_append_sheet(book, sheet, "프로그램");
  edit?.(book, sheet);
  return new Uint8Array(XLSX.write(book, { type: "array", bookType: "xlsx", compression: true }));
}
function formulaFile(kind: string): Uint8Array {
  const bytes = file([row, ["LE", "SECOND", ...row.slice(2)]], headers, (_book, sheet) => {
    sheet.C2 = { t: "s", v: "담당", f: '"담당"', ...(kind === "array" ? { F: "C2:C3" } : {}) };
    if (kind === "shared") sheet.C3 = { t: "s", v: "담당", f: '"담당"' };
    sheet["!ref"] = "A1:I3";
  });
  if (kind !== "shared") return bytes;
  const archive = XLSX.CFB.read(bytes, { type: "array" });
  const entry =
    archive.FileIndex[
      archive.FullPaths.findIndex((path: string) => path.endsWith("/xl/worksheets/sheet1.xml"))
    ];
  const xml = Buffer.from(entry.content as Uint8Array)
    .toString("utf8")
    .replace(/<f>[^<]*<\/f>/, '<f t="shared" ref="C2:C3" si="0">"담당"</f>')
    .replace(/<f>[^<]*<\/f>/, '<f t="shared" si="0"/>');
  entry.content = Buffer.from(xml);
  entry.size = entry.content.length;
  return new Uint8Array(XLSX.CFB.write(archive, { type: "buffer", fileType: "zip" }));
}
async function invalid(data: Uint8Array, rowNumber: number, field: string, message = /\S/) {
  const result = await previewExcel(data, []);
  expect(result.rows).toEqual([]);
  expect(result.errors).toContainEqual({
    row: rowNumber,
    field,
    message: expect.stringMatching(message),
  });
}
it("S01 AC1 should download a real single-sheet fixed-header template when requested", () => {
  expect(excelHeaders).toEqual(headers);
  const bytes = createExcelTemplate();
  expect(bytes).toBeInstanceOf(Uint8Array);
  expect(Array.from(bytes.slice(0, 2))).toEqual([80, 75]);
  const book = XLSX.read(bytes, { type: "array" });
  expect(book.SheetNames).toHaveLength(1);
  expect(XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1 })).toEqual([
    headers,
  ]);
});
it("S02 AC1 should normalize nine fields without mutation when previewing a real workbook", async () => {
  const existing = Object.freeze([Object.freeze({ ...expected, id: "old", programName: "OTHER" })]);
  const data = file();
  const before = data.slice();
  expect(await previewExcel(data, existing)).toEqual({ rows: [expected], errors: [] });
  expect(data).toEqual(before);
  expect(existing[0].programName).toBe("OTHER");
});
it("S03 AC3 should default blank status and optional fields when only identities exist", async () => {
  expect(await previewExcel(file([["mm", "new", "", "", "", "", "", "", ""]]), [])).toEqual({
    rows: [
      {
        ...expected,
        module: "MM",
        programName: "NEW",
        owner: "",
        changeType: "",
        status: "개발 대기",
        plannedStartDate: null,
        plannedEndDate: null,
        actualCompletionDate: null,
        transferDate: null,
      },
    ],
    errors: [],
  });
});
it.each([
  headers.slice(1),
  [...headers, "추가"],
  ["모듈", "모듈", ...headers.slice(2)],
  [...headers].reverse(),
])("S04 AC2 should reject headers when not exact: %j", async (...columns) => {
  await invalid(file([row], columns), 1, "열");
});
it("S04 AC2 should reject multiple sheets when outside the template profile", async () => {
  await invalid(
    file([row], headers, (book) =>
      XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([headers]), "추가"),
    ),
    0,
    "파일",
  );
});
it("S05 AC2 should collect all row errors and no partial rows when input is invalid", async () => {
  const result = await previewExcel(
    file([row, ["", "", "", "", "잘못됨", "2026-02-30", "", "", ""]]),
    [],
  );
  expect(result.rows).toEqual([]);
  for (const field of ["모듈", "프로그램명", "진행 상태", "개발 시작 예정일"])
    expect(result.errors).toContainEqual({ row: 3, field, message: expect.stringMatching(/\S/) });
});
it("S06 AC2 should reject normalized internal duplicates when keys differ only in whitespace and case", async () => {
  await invalid(file([row, ["LE", "ORDER", ...row.slice(2)]]), 3, "프로그램명");
});
it("S06 AC2 should reject existing duplicates without changing existing records", async () => {
  const existing = [{ ...expected, id: "keep" }];
  const result = await previewExcel(file(), existing);
  expect(result.rows).toEqual([]);
  expect(result.errors).toContainEqual({
    row: 2,
    field: "프로그램명",
    message: expect.stringMatching(/\S/),
  });
  expect(existing).toEqual([{ ...expected, id: "keep" }]);
});
it("S06 AC2 should preserve distinct composite keys when delimiters collide", async () => {
  expect(
    (
      await previewExcel(
        file([
          ["A:B", "C"],
          ["A", "B:C"],
        ]),
        [],
      )
    ).rows,
  ).toHaveLength(2);
});
it.each(["normal", "shared", "array"])(
  "S07 AC2 should reject cached %s formulas without evaluating them",
  async (kind) => {
    const bytes = formulaFile(kind);
    const archive = XLSX.CFB.read(bytes, { type: "array" });
    const entry =
      archive.FileIndex[
        archive.FullPaths.findIndex((path: string) => path.endsWith("/xl/worksheets/sheet1.xml"))
      ];
    const xml = Buffer.from(entry.content as Uint8Array).toString("utf8");
    const sheet = XLSX.read(bytes, { type: "array", cellFormula: true }).Sheets["프로그램"];
    expect(sheet.C2.v).toBe("담당");
    expect(sheet.C2.f).toBe('"담당"');
    if (kind === "shared") {
      expect(xml).toMatch(
        /<c\b[^>]*r="C2"[^>]*><f t="shared" ref="C2:C3" si="0">[^<]+<\/f><v>담당<\/v><\/c>/,
      );
      expect(xml).toMatch(/<c\b[^>]*r="C3"[^>]*><f t="shared" si="0"\/><v>담당<\/v><\/c>/);
      expect(sheet.C3.v).toBe("담당");
      expect(sheet.C3.f).toBe('"담당"');
    }
    if (kind === "array") expect(sheet.C2.F).toBe("C2:C3");
    await invalid(bytes, 2, "담당자", /수식/);
    if (kind === "shared") await invalid(bytes, 3, "담당자", /수식/);
  },
);
it("S06 AC2 should trim only edges and preserve internal spaces when normalizing keys", async () => {
  const result = await previewExcel(
    file([
      [" le x ", " order  entry "],
      ["LEX", "ORDERENTRY"],
    ]),
    [{ ...expected, id: "existing", module: "LE X", programName: "ORDER ENTRY" }],
  );
  expect(result.errors).toEqual([]);
  expect(result.rows.map(({ module, programName }) => ({ module, programName }))).toEqual([
    { module: "LE X", programName: "ORDER  ENTRY" },
    { module: "LEX", programName: "ORDERENTRY" },
  ]);
});
it.each([60, -1, 45000.5])(
  "S08 AC3 should reject invalid serial %s when date formatted",
  async (serial) => {
    await invalid(
      file([row], headers, (_book, sheet) => {
        sheet.F2 = { t: "n", v: serial, z: "yyyy-mm-dd" };
      }),
      2,
      "개발 시작 예정일",
    );
  },
);
it.each(["UTC", "Asia/Seoul", "America/Los_Angeles"])(
  "S08 AC3 should preserve calendar dates when timezone is %s",
  async (timezone) => {
    const previous = process.env.TZ;
    process.env.TZ = timezone;
    try {
      for (const date1904 of [false, true]) {
        const bytes = file([["LE", "DATES"]], headers, (book, sheet) => {
          book.Workbook = { WBProps: { date1904 } };
          for (const column of ["F", "G", "H", "I"])
            sheet[column + "2"] = { t: "n", v: date1904 ? 1 : 1463, z: "yyyy-mm-dd" };
          sheet["!ref"] = "A1:I2";
        });
        const result = await previewExcel(bytes, []);
        expect(result.errors).toEqual([]);
        expect(result.rows[0]).toMatchObject({
          plannedStartDate: "1904-01-02",
          plannedEndDate: "1904-01-02",
          actualCompletionDate: "1904-01-02",
          transferDate: "1904-01-02",
        });
      }
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  },
);
it.each([0, 1, 2, 3, 4, 5])(
  "S09 AC2 should reject plain numbers when column %s is not a date cell",
  async (column) => {
    const values: unknown[] = [...row];
    values[column] = 42;
    await invalid(file([values]), 2, headers[column]);
  },
);
it.each([[], [["", "", "", "", "", "", "", "", ""]]])(
  "S10 AC4 should reject empty data when workbook has %j",
  async (...rows) => {
    await invalid(file(rows), 0, "파일");
  },
);
it.each([
  new Uint8Array(),
  new TextEncoder().encode("모듈,프로그램명\nLE,A"),
  new Uint8Array([80, 75, 3, 4]),
])("S10 AC4 should reject wrong formats when bytes are not xlsx", async (data) => {
  await invalid(data, 0, "파일");
});
it.each([999, 1000, 1001])(
  "S11 AC4 should enforce upload row boundary when count is %s",
  async (count) => {
    const result = await previewExcel(
      file(Array.from({ length: count }, (_, index) => ["LE", "P" + index])),
      [],
    );
    if (count <= 1000) {
      expect(result.errors).toEqual([]);
      expect(result.rows).toHaveLength(count);
    } else {
      expect(result.rows).toEqual([]);
      expect(result.errors).toContainEqual({
        row: 0,
        field: "파일",
        message: expect.stringMatching(/\S/),
      });
    }
  },
);
it.each([1999, 2000, 2001])(
  "S11 AC4 should enforce technical cell guard when length is %s",
  async (length) => {
    const bytes = file([["LE", "P", "가".repeat(length)]]);
    if (length > 2000) await invalid(bytes, 2, "담당자");
    else expect((await previewExcel(bytes, [])).rows[0]?.owner).toBe("가".repeat(length));
  },
);
it("S05 AC2 should reject reversed planned dates when end precedes start", async () => {
  await invalid(file([[...row.slice(0, 6), "2026-08-01", "", ""]]), 2, "개발 완료 예정일");
});
