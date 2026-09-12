import { deflateRawSync } from "node:zlib";
import { expect, it } from "vitest";
import * as XLSX from "xlsx";
import { validateXlsxZip } from "../../src/domain/xlsx-zip";

type Entry = {
  name: string;
  size?: number;
  declared?: number;
  method?: number;
  flags?: number;
  localName?: string;
};
function zip(entries: Entry[]): Uint8Array {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const localName = Buffer.from(entry.localName ?? entry.name);
    const method = entry.method ?? 8;
    const raw = Buffer.alloc(entry.size ?? 1, 65);
    const payload = method === 8 ? deflateRawSync(raw) : raw;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(entry.flags ?? 0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(entry.declared ?? raw.length, 22);
    local.writeUInt16LE(localName.length, 26);
    locals.push(local, localName, payload);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(entry.flags ?? 0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(entry.declared ?? raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + localName.length + payload.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
const mib = 1024 * 1024;
it.each([false, true])(
  "S12 AC4 should accept real SheetJS ZIP when compression is %s",
  async (compression) => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([
        ["모듈", "프로그램명"],
        ["LE", "A"],
      ]),
      "프로그램",
    );
    await expect(
      validateXlsxZip(
        new Uint8Array(XLSX.write(book, { type: "array", bookType: "xlsx", compression })),
      ),
    ).resolves.toBeUndefined();
  },
);
it.each([0, 8])("S12 AC4 should accept structural ZIP when method is %s", async (method) => {
  await expect(
    validateXlsxZip(zip([{ name: "xl/workbook.xml", method }])),
  ).resolves.toBeUndefined();
});
it.each([99, 100, 101])("S12 AC4 should enforce entry boundary when count is %s", async (count) => {
  const promise = validateXlsxZip(
    zip(Array.from({ length: count }, (_, index) => ({ name: "entry" + index }))),
  );
  if (count <= 100) await expect(promise).resolves.toBeUndefined();
  else await expect(promise).rejects.toThrow(Error);
});
it.each([2 * mib - 1, 2 * mib, 2 * mib + 1])(
  "S12 AC4 should enforce file boundary when bytes are %s",
  async (size) => {
    const overhead = zip([{ name: "a", size: 0, method: 0 }]).length;
    const bytes = zip([{ name: "a", size: size - overhead, method: 0 }]);
    expect(bytes.length).toBe(size);
    if (size <= 2 * mib) await expect(validateXlsxZip(bytes)).resolves.toBeUndefined();
    else await expect(validateXlsxZip(bytes)).rejects.toThrow(Error);
  },
);
it.each([10 * mib - 1, 10 * mib, 10 * mib + 1])(
  "S13 AC4 should enforce actual entry boundary when expanded bytes are %s",
  async (size) => {
    const bytes = zip([{ name: "a", size }]);
    expect(bytes.length).toBeLessThan(2 * mib);
    if (size <= 10 * mib) await expect(validateXlsxZip(bytes)).resolves.toBeUndefined();
    else await expect(validateXlsxZip(bytes)).rejects.toThrow(Error);
  },
);
it.each([-1, 0, 1])(
  "S13 AC4 should enforce total decompressed boundary when delta is %s",
  async (delta) => {
    const bytes = zip([
      { name: "a", size: 10 * mib },
      { name: "b", size: 10 * mib - 1 },
      { name: "c", size: 1 + delta },
    ]);
    if (delta <= 0) await expect(validateXlsxZip(bytes)).resolves.toBeUndefined();
    else await expect(validateXlsxZip(bytes)).rejects.toThrow(Error);
  },
);
it.each([
  [{ name: "a", size: 10 * mib + 1, declared: 1 }],
  [
    { name: "a", size: 8 * mib, declared: 1 },
    { name: "b", size: 8 * mib, declared: 1 },
    { name: "c", size: 8 * mib, declared: 1 },
  ],
  [{ name: "a", size: 100, declared: 1 }],
  [{ name: "a", size: 1, declared: 100 }],
])(
  "S13 AC4 should reject forged size or compressed bombs when metadata lies: %j",
  async (...entries) => {
    await expect(validateXlsxZip(zip(entries))).rejects.toThrow(Error);
  },
);
it.each([
  [{ name: "a" }, { name: "a" }],
  [{ name: "../a" }],
  [{ name: "/a" }],
  [{ name: "xl/../../a" }],
  [{ name: "xl\\a" }],
  [{ name: "a", flags: 1 }],
  [{ name: "a", method: 99 }],
  [{ name: "a", declared: 0xffffffff }],
  [{ name: "a", localName: "b" }],
])("S14 AC4 should reject unsafe structural entries when supplied: %j", async (...entries) => {
  await expect(validateXlsxZip(zip(entries))).rejects.toThrow(Error);
});
it.each(["truncated", "offset", "signature", "method", "multidisk"])(
  "S14 AC4 should reject malformed ZIP when %s differs",
  async (kind) => {
    const bytes = Buffer.from(zip([{ name: "a" }]));
    if (kind === "truncated") {
      await expect(validateXlsxZip(bytes.subarray(0, bytes.length - 1))).rejects.toThrow(Error);
      return;
    }
    if (kind === "offset") bytes.writeUInt32LE(0xffffffff, bytes.length - 6);
    if (kind === "signature") bytes.writeUInt32LE(0, 0);
    if (kind === "method") bytes.writeUInt16LE(0, 8);
    if (kind === "multidisk") bytes.writeUInt16LE(1, bytes.length - 18);
    await expect(validateXlsxZip(bytes)).rejects.toThrow(Error);
  },
);
