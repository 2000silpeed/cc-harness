import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);

try {
  const targetIndex = args.indexOf("--target");
  const targetValue = args[targetIndex + 1];
  if (
    targetIndex < 0 ||
    !targetValue ||
    targetValue.startsWith("--") ||
    args.some(
      (argument, index) => !["--target", "--apply"].includes(argument) && index !== targetIndex + 1,
    )
  ) {
    throw new Error("사용법: node scripts/install-harness.mjs --target <기존 대상 폴더> [--apply]");
  }
  const targetRoot = resolve(targetValue);
  if (
    !existsSync(targetRoot) ||
    !lstatSync(targetRoot).isDirectory() ||
    lstatSync(targetRoot).isSymbolicLink()
  ) {
    throw new Error("대상은 심볼릭 링크가 아닌 기존 디렉터리여야 합니다.");
  }
  if (targetRoot === resolve(sourceRoot))
    throw new Error("하네스 원본을 이식 대상으로 지정할 수 없습니다.");
  const registry = JSON.parse(
    readFileSync(resolve(sourceRoot, "docs/harness/registry.json"), "utf8"),
  );
  const files = [
    ...new Set([
      "docs/harness/registry.json",
      ...registry.skills.map((skill) => skill.path),
      ...registry.documents,
      ...registry.supportFiles,
      ...registry.distributionTools,
    ]),
  ];
  const plan = [];
  const conflicts = [];
  for (const filename of files) {
    if (isAbsolute(filename) || filename.split(/[\\/]/).includes(".."))
      throw new Error(`안전하지 않은 등록 경로: ${filename}`);
    const source = resolve(sourceRoot, filename);
    if (!existsSync(source) || !lstatSync(source).isFile() || lstatSync(source).isSymbolicLink())
      throw new Error(`원본 파일 누락 또는 비정규 파일: ${filename}`);
    const destination = resolve(targetRoot, filename);
    if (relative(targetRoot, destination).startsWith(".."))
      throw new Error(`대상 밖 경로: ${filename}`);
    const segments = relative(targetRoot, destination).split(sep);
    let current = targetRoot;
    let unsafe = false;
    for (let index = 0; index < segments.length; index += 1) {
      current = resolve(current, segments[index]);
      if (!existsSync(current)) {
        try {
          if (lstatSync(current).isSymbolicLink()) unsafe = true;
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        continue;
      }
      const stat = lstatSync(current);
      if (stat.isSymbolicLink() || (index < segments.length - 1 && !stat.isDirectory()))
        unsafe = true;
    }
    if (unsafe) {
      conflicts.push(`${filename}: 링크 또는 잘못된 상위 경로`);
      continue;
    }
    const contents = readFileSync(source);
    if (existsSync(destination)) {
      if (!lstatSync(destination).isFile() || !readFileSync(destination).equals(contents))
        conflicts.push(`${filename}: 기존 내용과 다름`);
      else plan.push({ filename, destination, status: "same" });
    } else plan.push({ filename, destination, status: "create", contents });
  }
  if (conflicts.length)
    throw new Error(`충돌: 아무 파일도 쓰지 않았습니다.\n${conflicts.join("\n")}`);
  for (const entry of plan) console.log(`${entry.status}: ${entry.filename}`);
  if (!args.includes("--apply")) {
    console.log("dry-run: 파일 변경 없음. 계획 확인 후 --apply를 사용하세요.");
  } else {
    for (const entry of plan.filter((item) => item.status === "create")) {
      mkdirSync(dirname(entry.destination), { recursive: true });
      writeFileSync(entry.destination, entry.contents, { flag: "wx" });
      console.log(`created: ${entry.filename}`);
    }
    console.log("스킬·문서 복사 완료. 대상 앱 설정·패키지·훅·전역 설정은 변경하지 않았습니다.");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
