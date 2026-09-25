import { lstatSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};
const localPath = (name, allowParents = false) => {
  if (
    typeof name !== "string" ||
    !name ||
    isAbsolute(name) ||
    /[\\:]/.test(name) ||
    [...name].some((character) => character.charCodeAt(0) < 32) ||
    (!allowParents && name.split("/").some((part) => !part || part === "." || part === ".."))
  )
    throw new Error("안전하지 않은 경로: " + name);
  let current = resolve(root);
  const parts = name.split("/");
  for (const [index, part] of parts.entries()) {
    current = resolve(current, part);
    const withinRoot = relative(root, current);
    if (withinRoot === ".." || withinRoot.startsWith(".." + sep) || isAbsolute(withinRoot))
      throw new Error("루트 밖 경로: " + name);
    const stat = lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error("심볼릭 링크 경로: " + name);
    if (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())
      throw new Error("비정규 파일 경로: " + name);
  }
  return current;
};

try {
  const registry = JSON.parse(readFileSync(localPath("docs/harness/registry.json"), "utf8"));
  if (!registry || typeof registry !== "object" || Array.isArray(registry))
    throw new Error("잘못된 registry 객체");
  check(registry.schemaVersion === 2, "지원하지 않는 registry 버전");
  const keys = [
    "schemaVersion",
    "scope",
    "skills",
    "documents",
    "supportFiles",
    "distributionTools",
  ];
  check(
    Object.keys(registry).every((key) => keys.includes(key)),
    "알 수 없는 registry 필드",
  );
  check(registry.scope === undefined || typeof registry.scope === "string", "잘못된 scope");
  for (const key of ["skills", "documents", "supportFiles", "distributionTools"]) {
    if (!Array.isArray(registry[key])) throw new Error("배열이 아닌 registry 필드: " + key);
  }
  check(registry.skills.length > 0, "등록 스킬 없음");
  const names = new Set();
  const paths = new Set(["docs/harness/registry.json"]);
  const contents = new Map();
  const descriptions = new Map();
  const register = (filename) => {
    check(!paths.has(filename), "중복 경로: " + filename);
    paths.add(filename);
    const content = readFileSync(localPath(filename), "utf8");
    contents.set(filename, content);
    return content;
  };
  for (const skill of registry.skills) {
    if (
      !skill ||
      typeof skill !== "object" ||
      typeof skill.name !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.name) ||
      skill.name.length > 64 ||
      !["procedure", "orchestration", "review-contract"].includes(skill.kind) ||
      Object.keys(skill).some((key) => !["name", "path", "kind"].includes(key))
    )
      throw new Error("잘못된 스킬 등록");
    check(!names.has(skill.name), "중복 스킬: " + skill.name);
    names.add(skill.name);
    check(
      skill.path === ".agents/skills/" + skill.name + "/SKILL.md",
      "스킬 경로 불일치: " + skill.name,
    );
    const content = register(skill.path);
    const header = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    check(Boolean(header), "frontmatter 없음: " + skill.path);
    const headerNames = [...(header ?? "").matchAll(/^name:\s*([^\r\n]+)$/gm)];
    check(
      headerNames.length === 1 && headerNames[0][1].trim() === skill.name,
      "이름 불일치: " + skill.path,
    );
    const description = (header ?? "").match(/^description:[ \t]*([^\r\n]*)$/m)?.[1].trim();
    check(
      Boolean(description) && !/^(['"])\s*\1(?:\s+#.*)?$/.test(description),
      "설명 없음: " + skill.path,
    );
    descriptions.set(skill.name, description);
  }
  for (const filename of [
    ...registry.documents,
    ...registry.supportFiles,
    ...registry.distributionTools,
  ])
    register(filename);
  const claudeSkills = new Set();
  for (const filename of registry.supportFiles) {
    const entry = filename.match(/^\.claude\/skills\/([^/]+)\/SKILL\.md$/)?.[1];
    if (!entry) continue;
    const name = contents.get(filename).match(/\.agents\/skills\/([a-z0-9-]+)\/SKILL\.md/)?.[1];
    claudeSkills.add(name);
    const header = contents.get(filename).match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    check(
      names.has(name) &&
        [name, "harness-" + name].includes(entry) &&
        header?.match(/^name:\s*([^\r\n]+)$/m)?.[1].trim() === entry &&
        header?.match(/^description:[ \t]*([^\r\n]*)$/m)?.[1].trim() === descriptions.get(name),
      "Claude 진입점 불일치: " + filename,
    );
  }
  if (claudeSkills.size)
    for (const name of names) check(claudeSkills.has(name), "Claude 진입점 누락: " + name);
  for (const [filename, content] of contents) {
    if (!filename.endsWith(".md")) continue;
    const links = [
      ...content.matchAll(/\[[^\]]*\]\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)/g),
      ...content.matchAll(/^\s*\[[^\]]+\]:\s*<?([^\s>]+)>?/gm),
    ];
    for (const [, rawLink] of links) {
      if (/^(?:https?:|mailto:|#|\/\/)/i.test(rawLink)) continue;
      const link = decodeURIComponent(rawLink.split(/[?#]/)[0]);
      if (!link) continue;
      if (isAbsolute(link) || link.includes("\\"))
        throw new Error("안전하지 않은 링크: " + filename + " → " + rawLink);
      try {
        localPath(dirname(filename).split(sep).join("/") + "/" + link, true);
      } catch (error) {
        errors.push("끊어진 링크: " + filename + " → " + rawLink + ": " + error.message);
      }
    }
    if (!filename.endsWith("/SKILL.md")) continue;
    for (const [reference] of content.matchAll(/docs\/methods\/[a-zA-Z0-9_./-]+\.md/g)) {
      try {
        localPath(reference);
        check(paths.has(reference), "미등록 방법 문서: " + reference);
      } catch (error) {
        errors.push("방법 문서 없음: " + filename + " → " + reference + ": " + error.message);
      }
    }
    for (const [, name] of content.matchAll(/\.agents\/skills\/([a-z0-9-]+)\/SKILL\.md/g))
      check(names.has(name), "연결 스킬 없음: " + filename + " → " + name);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  console.log("하네스 검사 통과: 스킬 " + names.size + "개, 등록 파일 " + paths.size + "개");
  console.log("파일·참조·등록 구조 검사이며 제품 구현·독립 검토·훅 발화 검증은 아닙니다.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
