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

const localAnchors = (path, markdown) => {
  const anchors = new Set();
  const usedSlugs = new Set();
  const content = readFileSync(path, "utf8").replace(/<!--[\s\S]*?(?:-->|$)/g, (comment) =>
    comment.replace(/[^\n]/g, ""),
  );
  const visible = [];
  let fence = null;
  for (const line of content.split(/\r?\n/)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (new RegExp(`^ {0,3}${fence[0]}{${fence[1]},}[ \\t]*$`).test(line)) fence = null;
      continue;
    }
    if (marker) {
      fence = [marker[1][0], marker[1].length];
      continue;
    }
    if (markdown && /^(?: {4}|\t)/.test(line)) continue;
    visible.push(line);
  }
  const original = visible.join("\n");
  const html = original.replace(/(`+)(.*?)\1/g, (code) => " ".repeat(code.length));
  const maskedRanges = [];
  const templates = [];
  const opaqueOpeners = new Set();
  let raw = null;
  for (const tag of html.matchAll(/<(\/?)([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)) {
    const closing = Boolean(tag[1]);
    const name = tag[2].toLowerCase();
    const end = tag.index + tag[0].length;
    if (raw) {
      if (closing && name === raw.name && raw.name !== "plaintext") {
        maskedRanges.push([raw.start, end]);
        raw = null;
      }
      continue;
    }
    if (closing) {
      if (name === "template" && templates.length) maskedRanges.push([templates.pop(), end]);
      continue;
    }
    if (name === "template") templates.push(end);
    const isRaw = [
      "script",
      "style",
      "textarea",
      "title",
      "xmp",
      "iframe",
      "noembed",
      "noframes",
      "noscript",
      "plaintext",
    ].includes(name);
    if (isRaw || name === "template") opaqueOpeners.add(tag.index);
    if (isRaw) raw = { name, start: end };
    if (templates.length > (name === "template" ? 1 : 0)) continue;
    const attributes = tag[3].matchAll(
      /(?:^|\s)([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g,
    );
    for (const attribute of attributes) {
      const attributeName = attribute[1].toLowerCase();
      if (
        (attributeName === "id" || (attributeName === "name" && name === "a")) &&
        (attribute[2] !== undefined || attribute[3] !== undefined || attribute[4] !== undefined)
      )
        anchors.add(attribute[2] ?? attribute[3] ?? attribute[4]);
    }
  }
  if (raw) maskedRanges.push([raw.start, original.length]);
  for (const start of templates) maskedRanges.push([start, original.length]);
  for (const candidate of html.matchAll(
    /<(?:script|style|textarea|title|template|xmp|iframe|noembed|noframes|noscript|plaintext)\b/gi,
  )) {
    if (
      !opaqueOpeners.has(candidate.index) &&
      !maskedRanges.some(([start, end]) => candidate.index >= start && candidate.index < end)
    )
      throw new Error("지원하지 않는 HTML raw-text 태그 형식");
  }
  let headings = original;
  for (const [start, end] of maskedRanges)
    headings =
      headings.slice(0, start) +
      headings.slice(start, end).replace(/[^\n]/g, " ") +
      headings.slice(end);
  if (!markdown) return anchors;
  for (const line of headings.split("\n")) {
    const heading = line.match(/^ {0,3}#{1,6}(?:[ \t]+|$)(.*)$/);
    if (!heading) continue;
    const label = heading[1]
      .replace(/[ \t]+#+[ \t]*$/, "")
      .replace(/!?\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/<[^>]*>/g, "")
      .replace(/[`*_~]/g, "")
      .trim()
      .toLowerCase();
    const base = label.replace(/[^\p{L}\p{N}_\-\s]/gu, "").replace(/\s/g, "-");
    let slug = base;
    for (let suffix = 1; usedSlugs.has(slug); suffix++) slug = `${base}-${suffix}`;
    usedSlugs.add(slug);
    anchors.add(slug);
  }
  return anchors;
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
  const claudeAgents = new Map([
    ["harness-worker-low", "claude-sonnet-5-5 low"],
    ["harness-worker", "claude-sonnet-5-5 medium"],
    ["harness-worker-high", "claude-opus-5-5 medium"],
    ["harness-verifier", "claude-opus-5-5 medium"],
    ["harness-diagnostic", "claude-opus-5-5 medium"],
  ]);
  const allowedClaudeRoute =
    /^claude-(?:sonnet-5-5|opus-5-5|fable-5-1) (?:low|medium|high|xhigh|max)$/;
  for (const filename of registry.supportFiles) {
    const agent = filename.match(/^\.claude\/agents\/([a-z0-9-]+)\.md$/)?.[1];
    if (!agent) continue;
    const header = contents.get(filename).match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    const route = [
      header?.match(/^model:[ \t]*([^\r\n]+)$/m)?.[1].trim(),
      header?.match(/^effort:[ \t]*([^\r\n]+)$/m)?.[1].trim(),
    ].join(" ");
    check(
      header?.match(/^name:\s*([^\r\n]+)$/m)?.[1].trim() === agent &&
        Boolean(header?.match(/^description:[ \t]*\S/m)) &&
        (claudeAgents.has(agent)
          ? route === claudeAgents.get(agent)
          : allowedClaudeRoute.test(route)) &&
        /\bAgent\b/.test(header?.match(/^disallowedTools:[ \t]*([^\r\n]*)$/m)?.[1] ?? ""),
      "Claude 에이전트 불일치: " + filename,
    );
  }
  const codexAgents = new Map([
    ["harness-worker-low", "low"],
    ["harness-worker", "medium"],
    ["harness-worker-high", "medium"],
    ["harness-verifier", "medium"],
    ["harness-diagnostic", "medium"],
  ]);
  const allowedCodexModel = /^gpt-(?:6-(?:sol|luna)|5\.6-(?:sol|terra|luna))$/;
  for (const filename of registry.supportFiles) {
    const agent = filename.match(/^\.codex\/agents\/([a-z0-9-]+)\.toml$/)?.[1];
    if (!agent) continue;
    const content = contents.get(filename);
    const field = (name) => content.match(new RegExp(`^${name} = "([^"]+)"$`, "m"))?.[1];
    const expected = codexAgents.get(agent);
    check(
      expected &&
        field("name") === agent &&
        Boolean(field("description")) &&
        allowedCodexModel.test(field("model") ?? "") &&
        field("model_reasoning_effort") === expected &&
        /^developer_instructions = """\r?\n[\s\S]+\r?\n"""$/m.test(content) &&
        /다시 위임하지 않는다|재귀 위임/.test(content) &&
        ((agent !== "harness-verifier" && agent !== "harness-diagnostic") ||
          /읽기 전용/.test(content)),
      "Codex 에이전트 불일치: " + filename,
    );
  }
  for (const [filename, content] of contents) {
    if (!filename.endsWith(".md")) continue;
    const links = [
      ...content.matchAll(/\[[^\]]*\]\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)/g),
      ...content.matchAll(/^\s*\[[^\]]+\]:\s*<?([^\s>]+)>?/gm),
    ];
    for (const [, rawLink] of links) {
      if (/^(?:https?:|mailto:|\/\/)/i.test(rawLink)) continue;
      try {
        const hashIndex = rawLink.indexOf("#");
        const address = hashIndex < 0 ? rawLink : rawLink.slice(0, hashIndex);
        const encodedFragment = hashIndex < 0 ? undefined : rawLink.slice(hashIndex + 1);
        const link = decodeURIComponent(address.split("?")[0]);
        if (isAbsolute(link) || link.includes("\\")) throw new Error("안전하지 않은 링크");
        if (!link && encodedFragment === undefined) continue;
        const target = localPath(
          link ? dirname(filename).split(sep).join("/") + "/" + link : filename,
          true,
        );
        if (encodedFragment === undefined) continue;
        if (!encodedFragment) throw new Error("지원하지 않는 빈 로컬 앵커");
        let fragment;
        try {
          fragment = decodeURIComponent(encodedFragment);
        } catch {
          throw new Error("지원하지 않는 로컬 앵커 인코딩");
        }
        const markdown = target.toLowerCase().endsWith(".md");
        if (!markdown && !/\.html?$/i.test(target)) throw new Error("지원하지 않는 로컬 앵커 대상");
        if (!localAnchors(target, markdown).has(fragment)) throw new Error("끊어진 앵커");
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
