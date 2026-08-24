import fs from "fs-extra";
import os from "os";
import path from "path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  cleanCss,
  ensureWithinProject,
  getFontStyle,
  getFontWeight,
  parseFontStyles,
  toCssQuotedString,
} from "../index.js";

test("ensureWithinProject accepts absolute paths inside the project", async () => {
  const resolved = await ensureWithinProject(
    "/home/runner/work/fontgen-cli/fontgen-cli/README.md",
  );

  assert.equal(
    resolved,
    "/home/runner/work/fontgen-cli/fontgen-cli/README.md",
  );
});

test("ensureWithinProject rejects paths outside the project", async () => {
  const resolved = await ensureWithinProject("/tmp/outside-file.css");

  assert.equal(resolved, false);
});

test("parseFontStyles treats matching family filename as regular", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fontgen-cli-test-"));
  const familyDir = path.join(tempDir, "inter");
  await fs.ensureDir(familyDir);
  await fs.writeFile(path.join(familyDir, "inter.ttf"), "");
  await fs.writeFile(path.join(familyDir, "inter-BoldItalic.woff2"), "");

  const styles = parseFontStyles(familyDir, "inter");

  assert.deepEqual(Object.keys(styles).sort(), ["bolditalic", "regular"]);
});

test("font metadata helpers support more common weights and styles", () => {
  assert.equal(getFontWeight("semibold"), "600");
  assert.equal(getFontWeight("extrabold"), "800");
  assert.equal(getFontStyle("oblique"), "italic");
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

test("toCssQuotedString preserves package-style import paths", () => {
  assert.equal(toCssQuotedString("@fontsource/inter"), "\"@fontsource/inter\"");
});
