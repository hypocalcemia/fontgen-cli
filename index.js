#!/usr/bin/env node
import fs from "fs-extra";
import path from "path";
import inquirer from "inquirer";
import { sync as globSync } from "glob";
import chalk from "chalk";
import postcss from "postcss";
import escapeStringRegexp from "escape-string-regexp";
import { pathToFileURL } from "url";

const { prompt } = inquirer;
const projectRoot = process.cwd();
const FONT_EXTENSIONS = new Set([".ttf", ".otf", ".woff", ".woff2"]);
const FONT_WEIGHT_RULES = [
  { sequences: [["thin"], ["hairline"]], weight: "100" },
  {
    sequences: [
      ["extra", "light"],
      ["ultra", "light"],
      ["extralight"],
      ["ultralight"],
    ],
    weight: "200",
  },
  { sequences: [["light"]], weight: "300" },
  { sequences: [["regular"], ["normal"], ["book"], ["roman"]], weight: "400" },
  { sequences: [["medium"]], weight: "500" },
  {
    sequences: [["semi", "bold"], ["demi", "bold"], ["semibold"], ["demibold"]],
    weight: "600",
  },
  {
    sequences: [["extra", "bold"], ["ultra", "bold"], ["extrabold"], ["ultrabold"]],
    weight: "800",
  },
  { sequences: [["bold"]], weight: "700" },
  {
    sequences: [
      ["black"],
      ["heavy"],
      ["extra", "black"],
      ["ultra", "black"],
      ["extrablack"],
      ["ultrablack"],
    ],
    weight: "900",
  },
];

if (projectRoot === path.parse(projectRoot).root) {
  console.error(
    chalk.red(
      "❌ Cannot run fontgen-cli directly from the system root directory.",
    ),
  );
  process.exit(1);
}

function sanitize(str) {
  return str.replace(/[^a-zA-Z0-9\-_.]/g, "");
}

function normalizeFontIdentifier(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function getFontTokens(value) {
  const normalized = normalizeFontIdentifier(value);
  return normalized ? normalized.split("-") : [];
}

function hasTokenSequence(tokens, sequence) {
  for (let index = 0; index <= tokens.length - sequence.length; index += 1) {
    if (sequence.every((token, offset) => tokens[index + offset] === token)) {
      return true;
    }
  }
  return false;
}

function toCssQuotedString(value) {
  return JSON.stringify(value.replace(/\\/g, "/"));
}

function createImportRule(importPath) {
  return postcss.atRule({
    name: "import",
    params: toCssQuotedString(importPath),
  });
}

async function ensureWithinProject(inputPath) {
  const resolved = path.resolve(projectRoot, inputPath);

  let current = resolved;
  while (!(await fs.pathExists(current))) {
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  try {
    const realCurrent = await fs.realpath(current);
    const realProjectRoot = await fs.realpath(projectRoot);
    if (
      realCurrent !== realProjectRoot &&
      !realCurrent.startsWith(realProjectRoot + path.sep)
    ) {
      return false;
    }
  } catch (err) {}
  return resolved;
}

async function isSafeToWrite(filePath) {
  try {
    if (await fs.pathExists(filePath)) {
      const stats = await fs.lstat(filePath);
      if (stats.isSymbolicLink()) return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

function relativeUrl(from, to) {
  let rel = path.relative(path.dirname(from), to).replace(/\\/g, "/");
  return rel.startsWith(".") ? rel : `./${rel}`;
}

function isCssPackage(familyDir) {
  const files = globSync("*", { cwd: familyDir, absolute: true });
  const cssFiles = files.filter((f) => f.toLowerCase().endsWith(".css"));
  return cssFiles.length > 0;
}

function resolveImportPath(familyDir) {
  const normalized = familyDir.replace(/\\/g, "/");
  const nmIndex = normalized.lastIndexOf("node_modules/");
  if (nmIndex !== -1) {
    return normalized.substring(nmIndex + "node_modules/".length);
  }
  return path.relative(projectRoot, familyDir).replace(/\\/g, "/");
}

function cleanCss(css, familyNames) {
  const root = postcss.parse(css);
  const escapedNames = familyNames.map((n) => escapeStringRegexp(n));

  root.walkAtRules("theme", (rule) => {
    rule.walkDecls((decl) => {
      if (
        escapedNames.some((name) => {
          const pattern = new RegExp(`^--font-${name}-`);
          return pattern.test(decl.prop);
        })
      ) {
        decl.remove();
      }
    });
    if (rule.nodes && rule.nodes.length === 0) {
      rule.remove();
    }
  });

  let inImportBlock = false;
  const nodesToRemove = [];
  root.each((node) => {
    if (node.type === "comment" && node.text.trim() === "fontgen-cli imports") {
      inImportBlock = true;
      nodesToRemove.push(node);
      return;
    }
    if (
      node.type === "comment" &&
      node.text.trim() === "end fontgen-cli imports"
    ) {
      inImportBlock = false;
      nodesToRemove.push(node);
      return;
    }
    if (inImportBlock) {
      nodesToRemove.push(node);
    }
  });
  nodesToRemove.forEach((node) => node.remove());

  root.walkAtRules("font-face", (rule) => {
    rule.walkDecls("font-family", (decl) => {
      const val = decl.value.replace(/["']/g, "");
      if (
        escapedNames.some((name) => {
          const escaped = escapeStringRegexp(name);
          return new RegExp(`^${escaped}(-|$)`).test(val);
        })
      ) {
        rule.remove();
      }
    });
  });

  root.walkRules((rule) => {
    if (
      escapedNames.some((name) => {
        const escaped = escapeStringRegexp(name);
        return new RegExp(`^\\.font-${escaped}(-|$)`).test(rule.selector);
      })
    ) {
      rule.remove();
    }
  });

  root.walkComments((comment) => {
    if (comment.text.trim() === "Custom @font-face rules") {
      comment.remove();
      return;
    }
    if (
      escapedNames.some((name) =>
        comment.text.includes(`Custom @font-face rules for ${name}`),
      )
    ) {
      comment.remove();
    }
  });

  return root.toString();
}

function getFamilyName(familyDir) {
  return normalizeFontIdentifier(path.basename(familyDir));
}

async function askFontsRoot() {
  while (true) {
    const { root } = await prompt({
      name: "root",
      type: "input",
      message: "Enter the path to your top-level fonts folder:",
      default: "src/fonts",
      validate: async (v) => {
        if (!v) return "Path is required.";
        const resolved = await ensureWithinProject(v);
        if (!resolved) return "❌ Path must be within the project directory.";
        if (
          !(await fs.pathExists(resolved)) ||
          !(await fs.stat(resolved)).isDirectory()
        ) {
          return `❌ Directory not found: ${v}`;
        }
        return true;
      },
    });
    return await ensureWithinProject(root);
  }
}

async function chooseFamilies(fontsRoot) {
  const entries = await fs.readdir(fontsRoot, { withFileTypes: true });
  const subdirectories = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name);

  if (subdirectories.length === 0) {
    console.log(
      chalk.yellow(
        "⚠ No font family folders found in the specified directory.",
      ),
    );
    process.exit(0);
  }

  const choices = [
    { name: chalk.bold("All Font Families"), value: "__ALL__" },
    new inquirer.Separator(),
    ...subdirectories.map((d) => ({ name: d, value: path.join(fontsRoot, d) })),
  ];

  const { families } = await prompt({
    name: "families",
    type: "checkbox",
    message: "Select the font families to include:",
    choices,
    validate: (v) => v.length > 0 || "Please select at least one font family.",
  });

  if (families.includes("__ALL__"))
    return subdirectories.map((d) => path.join(fontsRoot, d));
  return families;
}

async function askTailwindFile() {
  while (true) {
    const { tw } = await prompt({
      name: "tw",
      type: "input",
      message: "Enter the path to your main Tailwind CSS file:",
      default: "src/app.css",
      validate: async (v) => {
        if (!v) return "File path is required.";
        const resolved = await ensureWithinProject(v);
        if (!resolved) return "❌ Path must be within the project directory.";
        if (
          !(await fs.pathExists(resolved)) ||
          !(await fs.stat(resolved)).isFile()
        ) {
          return `❌ File not found: ${v}`;
        }
        return true;
      },
    });
    return await ensureWithinProject(tw);
  }
}

async function askStandardCssFile() {
  const { output } = await prompt({
    name: "output",
    type: "input",
    message: "Enter the desired path for the generated fonts CSS file:",
    default: "src/fonts.css",
    validate: async (v) => {
      if (!v) return "File path is required.";
      const resolved = await ensureWithinProject(v);
      if (!resolved) return "❌ Path must be within the project directory.";
      if (!v.toLowerCase().endsWith(".css"))
        return "❌ File must have a .css extension.";
      return true;
    },
  });
  return await ensureWithinProject(output);
}

function parseFontStyles(familyDir, familyName) {
  const fontFiles = globSync("*", { cwd: familyDir, absolute: true });
  const actualFontFiles = fontFiles.filter((file) => {
    return FONT_EXTENSIONS.has(path.extname(file).toLowerCase());
  });

  if (!actualFontFiles.length) return null;

  const styleToFile = {};
  const normalizedFamilyName = normalizeFontIdentifier(familyName);
  actualFontFiles.forEach((fp) => {
    const base = path.basename(fp, path.extname(fp));
    const normalizedBase = normalizeFontIdentifier(base);
    const style = normalizedBase.startsWith(`${normalizedFamilyName}-`)
      ? normalizedBase.slice(normalizedFamilyName.length + 1)
      : normalizedBase === normalizedFamilyName
        ? "regular"
        : normalizedBase;
    if (!style) return;
    if (styleToFile[style]) {
      throw new Error(
        `Duplicate normalized style "${style}" for family "${normalizedFamilyName}" from ${path.basename(styleToFile[style])} and ${path.basename(fp)}`,
      );
    }
    styleToFile[style] = fp;
  });

  return styleToFile;
}

function getFontWeight(style) {
  const tokens = getFontTokens(style);
  for (const rule of FONT_WEIGHT_RULES) {
    if (rule.sequences.some((sequence) => hasTokenSequence(tokens, sequence))) {
      return rule.weight;
    }
  }
  return "400";
}

function getFontStyle(style) {
  const tokens = getFontTokens(style);
  if (hasTokenSequence(tokens, ["oblique"])) return "oblique";
  if (hasTokenSequence(tokens, ["italic"])) return "italic";
  return "normal";
}

function buildStandardCss(existingCss, familyDirs, cssOutputPath, log = () => {}) {
  const root = existingCss ? postcss.parse(existingCss) : postcss.root();
  const importNodes = [];

  for (const familyDir of familyDirs) {
    const familyName = getFamilyName(familyDir);

    if (isCssPackage(familyDir)) {
      const importPath = resolveImportPath(familyDir);
      importNodes.push(createImportRule(importPath));
      log(`✔  [${familyName}] Detected CSS package → @import '${importPath}'`);
      continue;
    }

    const styleToFile = parseFontStyles(familyDir, familyName);
    if (!styleToFile) {
      log(`⚠ No font files (ttf, otf, woff, woff2) found under ${familyName}`);
      continue;
    }

    const styles = Object.keys(styleToFile).sort();
    log(`✔ [${familyName}] Found styles: ${styles.join(", ")}`);

    styles.forEach((style) => {
      const filePath = styleToFile[style];
      const rawUrl = relativeUrl(cssOutputPath, filePath);
      const url = encodeURI(rawUrl).replace(/"/g, "%22").replace(/'/g, "%27");
      const fontWeight = getFontWeight(style);
      const fontStyle = getFontStyle(style);
      const fontFaceName = `${familyName}-${style}`;
      const className = `font-${fontFaceName}`;
      const format = path.extname(filePath).slice(1);

      const faceRule = postcss.atRule({ name: "font-face" });
      faceRule.append(
        postcss.decl({ prop: "font-family", value: `"${fontFaceName}"` }),
      );
      faceRule.append(
        postcss.decl({
          prop: "src",
          value: `url("${url}") format("${format}")`,
        }),
      );
      faceRule.append(postcss.decl({ prop: "font-weight", value: fontWeight }));
      faceRule.append(postcss.decl({ prop: "font-style", value: fontStyle }));
      root.append(faceRule);

      const classRule = postcss.rule({ selector: `.${className}` });
      classRule.append(
        postcss.decl({
          prop: "font-family",
          value: `"${fontFaceName}", sans-serif`,
        }),
      );
      classRule.append(postcss.decl({ prop: "font-weight", value: fontWeight }));
      classRule.append(postcss.decl({ prop: "font-style", value: fontStyle }));
      root.append(classRule);
    });
  }

  if (importNodes.length > 0) {
    const importBlock = postcss.root();
    importBlock.append(postcss.comment({ text: " fontgen-cli imports " }));
    importNodes.forEach((node) => importBlock.append(node));
    importBlock.append(postcss.comment({ text: " end fontgen-cli imports " }));
    root.prepend(importBlock);
  }

  return root.toString();
}

function buildTailwindCss(existingCss, familyDirs, twPath, log = () => {}) {
  const root = postcss.parse(existingCss);
  const importNodes = [];
  const themeDecls = [];
  const faceRules = [];

  for (const familyDir of familyDirs) {
    const familyName = getFamilyName(familyDir);

    if (isCssPackage(familyDir)) {
      const importPath = resolveImportPath(familyDir);
      importNodes.push(createImportRule(importPath));
      log(`✔  [${familyName}] Detected CSS package → @import '${importPath}'`);
      continue;
    }

    const styleToFile = parseFontStyles(familyDir, familyName);
    if (!styleToFile) {
      log(`⚠ No font files (ttf, otf, woff, woff2) found under ${familyName}`);
      continue;
    }

    const styles = Object.keys(styleToFile).sort();
    log(`✔  [${familyName}] Found styles: ${styles.join(", ")}`);

    styles.forEach((style) => {
      const themeKey = `--font-${familyName}-${style}`;
      themeDecls.push(
        postcss.decl({
          prop: themeKey,
          value: `"${familyName}-${style}", sans-serif`,
        }),
      );
    });

    faceRules.push(
      postcss.comment({
        text: ` Custom @font-face rules for ${familyName} `,
      }),
    );

    styles.forEach((style) => {
      const filePath = styleToFile[style];
      const rawUrl = relativeUrl(twPath, filePath);
      const url = encodeURI(rawUrl).replace(/"/g, "%22").replace(/'/g, "%27");
      const fontWeight = getFontWeight(style);
      const fontStyle = getFontStyle(style);
      const fontFaceName = `${familyName}-${style}`;
      const format = path.extname(filePath).slice(1);

      const faceRule = postcss.atRule({ name: "font-face" });
      faceRule.append(
        postcss.decl({ prop: "font-family", value: `"${fontFaceName}"` }),
      );
      faceRule.append(
        postcss.decl({
          prop: "src",
          value: `url("${url}") format("${format}")`,
        }),
      );
      faceRule.append(postcss.decl({ prop: "font-weight", value: fontWeight }));
      faceRule.append(postcss.decl({ prop: "font-style", value: fontStyle }));
      faceRules.push(faceRule);
    });
  }

  if (importNodes.length > 0) {
    root.append(postcss.comment({ text: " fontgen-cli imports " }));
    importNodes.forEach((node) => root.append(node));
    root.append(postcss.comment({ text: " end fontgen-cli imports " }));
  }

  if (themeDecls.length > 0) {
    let themeRule = null;
    root.walkAtRules("theme", (rule) => {
      themeRule = rule;
    });

    if (!themeRule) {
      themeRule = postcss.atRule({ name: "theme" });
      root.append(themeRule);
    }

    themeRule.append(postcss.comment({ text: " fontgen-cli fonts " }));
    themeDecls.forEach((decl) => themeRule.append(decl));
  }

  if (faceRules.length > 0) {
    root.append(postcss.comment({ text: " Custom @font-face rules " }));
    faceRules.forEach((node) => root.append(node));
  }

  return root.toString();
}

async function main() {
  const { cssType } = await prompt({
    name: "cssType",
    type: "list",
    message: "Do you want to generate TailwindCSS or Standard CSS?",
    choices: ["TailwindCSS", "Standard CSS"],
  });

  const fontsRoot = await askFontsRoot();
  const familyDirs = await chooseFamilies(fontsRoot);
  const familyNames = familyDirs.map((fd) => getFamilyName(fd));

  if (cssType === "TailwindCSS") {
    const twPath = await askTailwindFile();
    let css = await fs.readFile(twPath, "utf-8");

    const cleanMode = process.argv.includes("--clean");
    if (cleanMode) {
      css = cleanCss(css, familyNames);
      if (!(await isSafeToWrite(twPath))) {
        console.error(
          chalk.red(
            `\n❌ Refusing to write to symlink or unsafe path: ${twPath}`,
          ),
        );
        process.exit(1);
      }
      await fs.writeFile(twPath, css, "utf-8");
      console.log(
        chalk.green(
          `🎉 Successfully removed font configurations for: ${familyNames.join(", ")}`,
        ),
      );
      process.exit(0);
    }

    css = buildTailwindCss(cleanCss(css, familyNames), familyDirs, twPath, (msg) => {
      if (msg.startsWith("⚠")) {
        console.warn(chalk.yellow(msg));
        return;
      }
      console.log(chalk.green(msg));
    });

    if (!(await isSafeToWrite(twPath))) {
      console.error(
        chalk.red(
          `\n❌ Refusing to write to symlink or unsafe path: ${twPath}`,
        ),
      );
      process.exit(1);
    }
    await fs.writeFile(twPath, css, "utf-8");
    console.log(
      chalk.green("\n🎉 Tailwind CSS font integration completed successfully!"),
    );
  } else {
    const cssOutputPath = await askStandardCssFile();

    let css = "";
    if (await fs.pathExists(cssOutputPath)) {
      css = await fs.readFile(cssOutputPath, "utf-8");
    }

    const cleanMode = process.argv.includes("--clean");
    if (cleanMode) {
      if (css) {
        css = cleanCss(css, familyNames);
        if (!(await isSafeToWrite(cssOutputPath))) {
          console.error(
            chalk.red(
              `\n❌ Refusing to write to symlink or unsafe path: ${cssOutputPath}`,
            ),
          );
          process.exit(1);
        }
        await fs.writeFile(cssOutputPath, css, "utf-8");
        console.log(
          chalk.green(
            `🎉 Successfully removed font configurations for: ${familyNames.join(", ")}`,
          ),
        );
      } else {
        console.log(chalk.yellow(`⚠ File not found: ${cssOutputPath}`));
      }
      process.exit(0);
    }

    css = buildStandardCss(
      css ? cleanCss(css, familyNames) : "",
      familyDirs,
      cssOutputPath,
      (msg) => {
        if (msg.startsWith("⚠")) {
          console.warn(chalk.yellow(msg));
          return;
        }
        console.log(chalk.green(msg));
      },
    );

    if (!(await isSafeToWrite(cssOutputPath))) {
      console.error(
        chalk.red(
          `\n❌ Refusing to write to symlink or unsafe path: ${cssOutputPath}`,
        ),
      );
      process.exit(1);
    }
    await fs.writeFile(cssOutputPath, css, "utf-8");
    console.log(
      chalk.green("\nStandard CSS font generation completed successfully!"),
    );
  }
}

export {
 buildStandardCss,
 buildTailwindCss,
 cleanCss,
 createImportRule,
 ensureWithinProject,
 getFamilyName,
 getFontStyle,
 getFontTokens,
 getFontWeight,
 hasTokenSequence,
 normalizeFontIdentifier,
 parseFontStyles,
 relativeUrl,
 sanitize,
 toCssQuotedString,
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 main().catch((err) => {
   if (err.message === "User force closed the prompt with SIGINT") {
     return;
   }
   console.error(
     chalk.red(
       `An error occurred. Please check your inputs and try again.\n${err.message}`,
     ),
   );
   process.exit(1);
 });
}
