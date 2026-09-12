// 웹폰트를 자체 호스팅으로 내려받습니다. 폰트 바이너리와 local.css 는 커밋하지 않습니다.
// 사용: node design-system/fonts/fetch-webfonts.mjs
//
// woff2 URL을 하드코딩하지 않습니다. 제공자 CSS를 받아서 그 안의 실제 URL을 해석하고,
// unicode-range 서브셋 구조를 그대로 보존한 채 로컬 경로로 다시 씁니다. 서브셋을
// 임의로 줄이면 한글 커버리지가 깨집니다.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// woff2를 받기 위해 필요합니다. 구형 UA로 요청하면 제공자가 ttf를 내려줍니다.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const manifest = JSON.parse(await readFile(join(here, "webfont-manifest.json"), "utf8"));

async function get(url, asText) {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${response.statusText}`);
  }
  return asText ? response.text() : Buffer.from(await response.arrayBuffer());
}

function localName(family, absoluteUrl) {
  const slug = family.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const base = new URL(absoluteUrl).pathname.split("/").pop();
  return `${slug}__${base}`;
}

const blocks = [];
let files = 0;

for (const entry of manifest.families) {
  if (entry.woff2_url) {
    const file = localName(entry.family, entry.woff2_url);
    await writeFile(join(here, file), await get(entry.woff2_url, false));
    files += 1;
    blocks.push(
      `/* ${entry.family} — ${entry.woff2_url} */\n` +
        "@font-face {\n" +
        `  font-family: "${entry.family}";\n` +
        "  font-style: normal;\n" +
        `  font-weight: ${entry.weight_range ?? "400 700"};\n` +
        "  font-display: swap;\n" +
        `  src: url("./${file}") format("woff2-variations");\n` +
        "}",
    );
    continue;
  }

  const css = await get(entry.css_url, true);
  const rewrites = new Map();
  for (const match of css.matchAll(/url\((['"]?)([^'")]+\.woff2[^'")]*)\1\)/gi)) {
    const raw = match[2];
    if (rewrites.has(raw)) continue;
    rewrites.set(raw, localName(entry.family, new URL(raw, entry.css_url).href));
  }
  if (rewrites.size === 0) {
    throw new Error(`${entry.family}: ${entry.css_url} 에서 woff2 URL을 찾지 못했습니다`);
  }
  for (const [raw, file] of rewrites) {
    await writeFile(join(here, file), await get(new URL(raw, entry.css_url).href, false));
    files += 1;
  }
  let rewritten = css;
  for (const [raw, file] of rewrites) {
    rewritten = rewritten.split(raw).join(`./${file}`);
  }
  blocks.push(`/* ${entry.family} — ${entry.css_url} */\n${rewritten.trim()}`);
  console.log(`${entry.family}: ${rewrites.size} woff2`);
}

const header =
  "/* design-system/fonts/fetch-webfonts.mjs 가 생성한 파일입니다. 커밋하지 않습니다. */\n" +
  "/* 제공자 CSS를 미러링했습니다. 다시 만들려면 스크립트를 실행하세요. */\n";
await writeFile(join(here, "local.css"), `${header}\n${blocks.join("\n\n")}\n`);
console.log(`local.css 생성 — 서체 ${manifest.families.length}종, 파일 ${files}개`);
