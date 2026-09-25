import { readFileSync } from "node:fs";

const [filename, heading, ...rest] = process.argv.slice(2);

try {
  if (!filename || !heading || rest.length || !/^#{1,6} \S/.test(heading))
    throw new Error('사용법: node scripts/read-section.mjs <문서> "## 제목"');
  const level = heading.match(/^#+/)[0].length;
  const lines = readFileSync(filename, "utf8").split(/\r?\n/);
  let fenced = false;
  let start = -1;
  let end = lines.length;
  for (const [index, line] of lines.entries()) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const found = line.match(/^(#{1,6}) /);
    if (!found) continue;
    if (start < 0 && line.trim() === heading.trim()) start = index;
    else if (start >= 0 && found[1].length <= level) {
      end = index;
      break;
    }
  }
  if (start < 0) {
    const headings = lines.filter((line) => /^#{1,6} /.test(line));
    throw new Error(`제목 없음: ${heading}\n사용 가능한 제목:\n${headings.join("\n")}`);
  }
  console.log(`${filename}:${start + 1}-${end}`);
  console.log(lines.slice(start, end).join("\n").trimEnd());
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
