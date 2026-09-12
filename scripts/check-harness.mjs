import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};
const localPath = (name) => {
  if (typeof name !== "string" || isAbsolute(name)) throw new Error("잘못된 등록 경로");
  const absolute = resolve(root, name);
  if (relative(root, absolute).startsWith("..")) throw new Error(`루트 밖 경로: ${name}`);
  return absolute;
};

try {
  const registry = JSON.parse(readFileSync(resolve(root, "docs/harness/registry.json"), "utf8"));
  check(registry.schemaVersion === 1, "지원하지 않는 registry 버전");
  const names = new Set();
  for (const skill of registry.skills) {
    check(!names.has(skill.name), `중복 스킬: ${skill.name}`);
    names.add(skill.name);
    const content = readFileSync(localPath(skill.path), "utf8");
    const header = content.match(/^---\n([\s\S]*?)\n---/);
    check(Boolean(header), `frontmatter 없음: ${skill.path}`);
    check(header?.[1].includes(`name: ${skill.name}\n`), `이름 불일치: ${skill.path}`);
    check(/^description:\s*\S.+$/m.test(header?.[1] ?? ""), `설명 없음: ${skill.path}`);
  }
  const ids = new Set();
  let pages = 0;
  let hashes = 0;
  for (const source of registry.sources) {
    check(!ids.has(source.id), `중복 강의: ${source.id}`);
    ids.add(source.id);
    check(Number.isInteger(source.pages) && source.pages > 0, `잘못된 페이지 수: ${source.id}`);
    check(
      source.reviewedPages.length === source.pages &&
        source.reviewedPages.every((page, index) => page === index + 1),
      `페이지 누락·중복: ${source.id}`,
    );
    check(existsSync(localPath(source.reviewDocument)), `판독 문서 없음: ${source.id}`);
    for (const name of source.skills)
      check(names.has(name), `연결 스킬 없음: ${source.id}/${name}`);
    const filename = localPath(source.file);
    if (existsSync(filename)) {
      hashes += 1;
      check(
        createHash("sha256").update(readFileSync(filename)).digest("hex") === source.sha256,
        `원본 해시 변경: ${source.file}`,
      );
    }
    pages += source.pages;
  }
  check(pages === registry.sourcePageTotal, "전체 페이지 합계 불일치");
  check(registry.sources.length === 18 && pages === 224, "강의 원본 범위 불일치");
  for (const filename of [
    ...registry.documents,
    ...registry.supportFiles,
    ...registry.distributionTools,
  ]) {
    check(existsSync(localPath(filename)), `등록 파일 없음: ${filename}`);
  }
  for (const filename of registry.documents) {
    if (!existsSync(localPath(filename))) continue;
    const content = readFileSync(localPath(filename), "utf8");
    for (const [, link] of content.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(link)) continue;
      const destination = resolve(
        dirname(localPath(filename)),
        decodeURIComponent(link.split("#")[0]),
      );
      check(
        !relative(root, destination).startsWith("..") && existsSync(destination),
        `끊어진 링크: ${filename} → ${link}`,
      );
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    `하네스 검사 통과: 스킬 ${names.size}개, 원본 ${registry.sources.length}개, 페이지 선언 ${pages}쪽`,
  );
  console.log(
    `원본 해시 확인 ${hashes}개 / 원본 미포함으로 건너뜀 ${registry.sources.length - hashes}개`,
  );
  console.log("파일·참조·등록 구조 검사이며 제품 구현·독립 검토·훅 발화 검증은 아닙니다.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
