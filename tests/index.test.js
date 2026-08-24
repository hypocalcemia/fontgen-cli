import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "fs-extra";
import os from "os";
import path from "path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  buildStandardCss,
  cleanCss,
  createImportRule,
  ensureWithinProject,
  getFontStyle,
  getFontWeight,
  normalizeFontIdentifier,
  parseFontStyles,
  toCssQuotedString,
} from "../index.js";

const repoRoot = "/home/runner/work/fontgen-cli/fontgen-cli";

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("ensureWithinProject accepts absolute paths inside the project", async () => {
  const resolved = await ensureWithinProject(
    "/home/runner/work/fontgen-cli/fontgen-cli/README.md",
  );

  assert.equal(
    resolved,
    "/home/runner/work/fontgen-cli/fontgen-cli/README.md",
  );
});

test("ensureWithinProject allows normalized in-project paths", async () => {
  const resolved = await ensureWithinProject("./tests/../README.md");

  assert.equal(
    resolved,
    "/home/runner/work/fontgen-cli/fontgen-cli/README.md",
  );
});

test("ensureWithinProject rejects traversal outside the project", async () => {
  const resolved = await ensureWithinProject("../../../../tmp/outside-file.css");

  assert.equal(resolved, false);
});

test("ensureWithinProject rejects absolute outside paths", async () => {
  const resolved = await ensureWithinProject("/tmp/outside-file.css");

  assert.equal(resolved, false);
});

test("ensureWithinProject rejects symlink escapes", async () => {
  const outsideDir = await makeTempDir("fontgen-cli-outside-");
  const symlinkPath = path.join(repoRoot, "tests", ".tmp-outside-link");

  await fs.ensureDir(path.dirname(symlinkPath));
  await fs.writeFile(path.join(outsideDir, "font.ttf"), "");
  await fs.symlink(outsideDir, symlinkPath);

  try {
    assert.equal(await ensureWithinProject(symlinkPath), false);
    assert.equal(await ensureWithinProject(path.join(symlinkPath, "font.ttf")), false);
  } finally {
    await fs.remove(symlinkPath);
    await fs.remove(outsideDir);
  }
});

test("parseFontStyles normalizes family names and mixed separators", async () => {
  const tempDir = await makeTempDir("fontgen-cli-parse-");
  const familyDir = path.join(tempDir, "My Font_One");
  await fs.ensureDir(familyDir);
  await fs.writeFile(path.join(familyDir, "My Font_One.ttf"), "");
  await fs.writeFile(path.join(familyDir, "My_Font_One-Bold.ttf"), "");
  await fs.writeFile(path.join(familyDir, "My.Font.One-Semi_Bold.otf"), "");
  await fs.writeFile(path.join(familyDir, "My Font One-Bold.Italic.woff2"), "");
  await fs.writeFile(path.join(familyDir, "OtherFamily-Black.woff"), "");
  await fs.writeFile(path.join(familyDir, "README.txt"), "");

  try {
    const styles = parseFontStyles(familyDir, "My Font_One");

    assert.deepEqual(Object.keys(styles).sort(), [
      "bold",
      "bold-italic",
      "other-family-black",
      "regular",
      "semi-bold",
    ]);
  } finally {
    await fs.remove(tempDir);
  }
});

test("parseFontStyles handles spaces, underscores, hyphens, compound styles, and multiple dots", async () => {
  const tempDir = await makeTempDir("fontgen-cli-parse-");
  const familyDir = path.join(tempDir, "Noto Sans");
  await fs.ensureDir(familyDir);
  await fs.writeFile(path.join(familyDir, "Noto Sans Extra_Bold Oblique.ttf"), "");
  await fs.writeFile(path.join(familyDir, "Noto-Sans-Light.Italic.v2.woff2"), "");
  await fs.writeFile(path.join(familyDir, "Noto_Sans-Display-Black.otf"), "");

  try {
    const styles = parseFontStyles(familyDir, "Noto Sans");

    assert.deepEqual(Object.keys(styles).sort(), [
      "display-black",
      "extra-bold-oblique",
      "light-italic-v2",
    ]);
  } finally {
    await fs.remove(tempDir);
  }
});

test("parseFontStyles rejects duplicate normalized styles", async () => {
  const tempDir = await makeTempDir("fontgen-cli-parse-");
  const familyDir = path.join(tempDir, "Inter");
  await fs.ensureDir(familyDir);
  await fs.writeFile(path.join(familyDir, "Inter Bold.ttf"), "");
  await fs.writeFile(path.join(familyDir, "Inter-Bold.woff2"), "");

  try {
    assert.throws(
      () => parseFontStyles(familyDir, "Inter"),
      /Duplicate normalized style "bold"/,
    );
  } finally {
    await fs.remove(tempDir);
  }
});

test("getFontWeight uses deterministic token matching for weights 100-900", () => {
  const cases = [
    ["thin", "100"],
    ["extra-light", "200"],
    ["light", "300"],
    ["regular", "400"],
    ["medium", "500"],
    ["semi-bold", "600"],
    ["bold", "700"],
    ["extra-bold", "800"],
    ["black", "900"],
  ];

  for (const [style, expected] of cases) {
    assert.equal(getFontWeight(style), expected, style);
  }

  assert.equal(getFontWeight("boldish"), "400");
});

test("getFontStyle preserves oblique and italic distinctly", () => {
  assert.equal(getFontStyle("semi-bold-oblique"), "oblique");
  assert.equal(getFontStyle("semi-bold-italic"), "italic");
  assert.equal(getFontStyle("regular"), "normal");
});

test("cleanCss removes prior generated imports and declarations", () => {
  const css = `/* fontgen-cli imports */
@import '@fontsource/inter';
/* end fontgen-cli imports */
@theme {
  --font-inter-regular: "inter-regular", sans-serif;
}
/* Custom @font-face rules for inter */
@font-face {
  font-family: "inter-regular";
  src: url("./inter.ttf") format("ttf");
}
.font-inter-regular {
  font-family: "inter-regular", sans-serif;
}`;

  const cleaned = cleanCss(css, ["inter"]);

  assert.equal(cleaned.includes("@fontsource/inter"), false);
  assert.equal(cleaned.includes("--font-inter-regular"), false);
  assert.equal(cleaned.includes(".font-inter-regular"), false);
});

test("toCssQuotedString round-trips special characters safely", () => {
  const cases = [
    '@fontsource/"quoted"',
    "@fontsource\\backslash",
    "@fontsource/space name",
    "@fontsource/üñïçødé",
    "@fontsource/with(paren)",
    "@fontsource/line\nbreak",
    "@fontsource/tab\tchar",
  ];

  for (const input of cases) {
    const quoted = toCssQuotedString(input);
    assert.equal(JSON.parse(quoted), input.replace(/\\/g, "/"));
  }
});

test("generated @import rules escape special characters safely", () => {
  const cases = [
    '@fontsource/"quoted"',
    "@fontsource\\backslash",
    "@fontsource/space name",
    "@fontsource/üñïçødé",
    "@fontsource/with(paren)",
    "@fontsource/control\rchar",
  ];

  for (const input of cases) {
    const expected = toCssQuotedString(input);
    assert.equal(createImportRule(input).toString(), `@import ${expected}`);
  }
});

test("importing index.js does not run the CLI prompt", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import ${JSON.stringify(pathToFileURL(path.join(repoRoot, "index.js")).href)}; console.log("IMPORTED_OK");`,
    ],
    { cwd: repoRoot, encoding: "utf-8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /IMPORTED_OK/);
  assert.doesNotMatch(
    result.stdout + result.stderr,
    /Do you want to generate TailwindCSS or Standard CSS/,
  );
});

test("direct CLI execution runs main()", async () => {
  const preloadDir = path.join(repoRoot, "tests", ".tmp-preload");
  const preloadFile = path.join(preloadDir, "preload.mjs");

  await fs.ensureDir(preloadDir);
  await fs.writeFile(
    preloadFile,
    `import inquirer from "inquirer";
inquirer.prompt = async () => {
  console.log("PROMPT_CALLED");
  throw new Error("prompt called");
};`,
  );

  try {
    const result = spawnSync(
      process.execPath,
      ["--import", preloadFile, path.join(repoRoot, "index.js")],
      { cwd: repoRoot, encoding: "utf-8" },
    );

    assert.equal(result.status, 1);
    assert.match(result.stdout, /PROMPT_CALLED/);
    assert.match(result.stderr, /prompt called/);
  } finally {
    await fs.remove(preloadDir);
  }
});

test("buildStandardCss generates end-to-end font CSS output", async () => {
  const tempDir = await makeTempDir("fontgen-cli-e2e-");
  const familyDir = path.join(tempDir, "Space Grotesk");
  const outputDir = path.join(tempDir, "styles");
  const outputPath = path.join(outputDir, "fonts.css");
  await fs.ensureDir(familyDir);
  await fs.ensureDir(outputDir);
  await fs.writeFile(path.join(familyDir, "Space Grotesk.ttf"), "");
  await fs.writeFile(
    path.join(familyDir, "Space_Grotesk-SemiBoldItalic.woff2"),
    "",
  );

  try {
    const css = buildStandardCss("", [familyDir], outputPath);

    assert.match(css, /font-space-grotesk-regular/);
    assert.match(css, /font-space-grotesk-semi-bold-italic/);
    assert.match(css, /font-weight: 600/);
    assert.match(css, /font-style: italic/);
    assert.match(css, /url\("\.\.\/Space%20Grotesk\/Space%20Grotesk\.ttf"\)/);
  } finally {
    await fs.remove(tempDir);
  }
});

test("normalizeFontIdentifier uses the same rules for directory names and filenames", () => {
  assert.equal(normalizeFontIdentifier("My Font_One.Bold"), "my-font-one-bold");
});
