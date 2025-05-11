#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import { sync as globSync } from 'glob';
import chalk from 'chalk';

const { prompt } = inquirer;
const projectRoot = process.cwd();

// Compute relative URL from CSS file to font file
function relativeUrl(from, to) {
  let rel = path.relative(path.dirname(from), to).replace(/\\/g, '/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

// Prompt for a valid fonts root
async function askFontsRoot() {
  while (true) {
    const { root } = await prompt({
      name: 'root', type: 'input',
      message: 'Top-level fonts folder (e.g. src/Fonts):',
      default: 'src/Fonts',
      validate: v => !!v || 'Required'
    });
    const full = path.join(projectRoot, root);
    if (await fs.pathExists(full) && (await fs.stat(full)).isDirectory()) {
      return full;
    }
    console.log(chalk.red(`❌ Not a valid directory: ${full}`));
  }
}

// Let user pick one or more families
async function chooseFamilies(fontsRoot) {
  const subs = (await fs.readdir(fontsRoot))
    .filter(d => fs.statSync(path.join(fontsRoot, d)).isDirectory());
  const { families } = await prompt({
    name: 'families', type: 'checkbox',
    message: 'Select font families:',
    choices: [{ name: 'All', value: '__ALL__' }, ...subs],
    validate: v => v.length > 0 || 'Pick at least one'
  });
  if (families.includes('__ALL__')) return subs.map(d => path.join(fontsRoot, d));
  return families.map(f => path.join(fontsRoot, f));
}

// Ask for Tailwind CSS file
async function askTailwindFile() {
  const { tw } = await prompt({
    name: 'tw', type: 'input',
    message: 'Tailwind CSS file to update:',
    default: 'src/app.css',
    validate: v => fs.pathExists(path.join(projectRoot, v)) || 'Not found'
  });
  return path.join(projectRoot, tw);
}

// Remove all @theme and @font-face blocks for given families
function cleanCss(css, familyNames) {
  // Remove any @theme block entirely
  css = css.replace(/@theme\s*\{[\s\S]*?\}/g, '');

  // Remove @font-face sections matching each familyName-
  familyNames.forEach(name => {
    const re = new RegExp(
      `\\/\\* Custom @font-face rules \\*\\/[\\s\\S]*?(?=@theme|$)`, 'g'
    );
    // Instead we remove individual blocks for that family
    css = css.replace(
      new RegExp(`@font-face \\{[\\s\\S]*?font-family:\\s*"\s*${name}-[^"]+"[\\s\\S]*?\\}`, 'g'),
      ''
    );
  });

  // Also tidy up multiple blank lines
  css = css.replace(/\n{3,}/g, '\n\n');
  return css;
}

async function main() {
  const cleanMode = process.argv.includes('--clean');
  const fontsRoot = await askFontsRoot();
  const familyDirs = await chooseFamilies(fontsRoot);
  const familyNames = familyDirs.map(fd => path.basename(fd));
  const twPath = await askTailwindFile();
  let css = await fs.readFile(twPath, 'utf-8');

  if (cleanMode) {
    // CLEAN: strip out existing blocks for selected families
    css = cleanCss(css, familyNames);
    await fs.writeFile(twPath, css, 'utf-8');
    console.log(chalk.green(`🎉 Removed fonts for: ${familyNames.join(', ')}`));
    process.exit(0);
  }

  // ADD MODE:

  // Remove old global blocks
  css = css
    .replace(/@theme\s*\{[\s\S]*?\}/g, '')
    .replace(/\/\* Custom @font-face rules \*\/[\s\S]*/g, '');

  const themeLines = ['@theme {'];
  const faceLines = ['/* Custom @font-face rules */'];

  for (const familyDir of familyDirs) {
    const familyName = path.basename(familyDir);
    const ttfPaths = globSync('**/*.ttf', { cwd: familyDir, absolute: true });
    if (!ttfPaths.length) {
      console.warn(chalk.yellow(`⚠ No .ttf found under ${familyName}`));
      continue;
    }
    // Map style → path
    const styleToPath = {};
    ttfPaths.forEach(fp => {
      const base = path.basename(fp, '.ttf');
      const [_, ...rest] = base.split('-');
      const style = rest.join('-');
      if (style) styleToPath[style] = fp;
    });
    const styles = Object.keys(styleToPath);
    console.log(chalk.green(`✔ [${familyName}] styles: ${styles.join(', ')}`));

    // @theme vars
    styles.forEach(style => {
      const faceFamily = `${familyName}-${style}`;
      themeLines.push(`  --font-${faceFamily.toLowerCase()}: "${faceFamily}", sans-serif;`);
    });

    // @font-face rules
    styles.forEach(style => {
      const fp = styleToPath[style];
      const url = relativeUrl(twPath, fp);
      const isVar = /variable/i.test(style);
      const weight = /bold/i.test(style) ? '700' : '400';
      const fontStyle = /italic/i.test(style) ? 'italic' : 'normal';
      const faceFamily = `${familyName}-${style}`;

      if (isVar) {
        faceLines.push(
          `@font-face {`,
          `  font-family: "${faceFamily}";`,
          `  src: url("${url}") format("truetype");`,
          `  font-weight: 100 900;`,
          `  font-style: normal;`,
          `  font-variation-settings: "wght" 400;`,
          `}`, ''
        );
      } else {
        faceLines.push(
          `@font-face {`,
          `  font-family: "${faceFamily}";`,
          `  src: url("${url}") format("truetype");`,
          `  font-weight: ${weight};`,
          `  font-style: ${fontStyle};`,
          `}`, ''
        );
      }
    });
  }

  themeLines.push('}', '');
  css += '\n' + themeLines.join('\n') + '\n' + faceLines.join('\n');
  await fs.writeFile(twPath, css, 'utf-8');
  console.log(chalk.green('\n🎉 Font generation completed successfully!'));
}

main().catch(err => {
  console.error(chalk.red(err.message || err));
  process.exit(1);
});
