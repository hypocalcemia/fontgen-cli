#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import { sync as globSync } from 'glob';
import chalk from 'chalk';
import fuzzy from 'fuzzy'; // For fuzzy searching and tab completion

const { prompt } = inquirer;
const projectRoot = process.cwd();

// Compute relative URL from CSS file to font file
function relativeUrl(from, to) {
  let rel = path.relative(path.dirname(from), to).replace(/\\/g, '/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

// Prompt for a valid fonts root with interactive directory selection
async function askFontsRoot() {
  while (true) {
    const { root } = await prompt({
      name: 'root',
      type: 'autocomplete', // Use autocomplete for directory selection
      message: 'Enter the path to your top-level fonts folder:',
      default: 'src/fonts',
      source: async (answersSoFar, input = '') => {
        const currentDir = projectRoot;
        const files = await fs.readdir(currentDir);
        const directories = files.filter(file =>
          fs.statSync(path.join(currentDir, file)).isDirectory() && !file.startsWith('.')
        );
        const fuzzyResult = fuzzy.filter(input, directories);
        return fuzzyResult.map(el => el.original);
      },
      validate: async (v) => {
        if (!v) return 'Path is required.';
        const full = path.join(projectRoot, v);
        if (!(await fs.pathExists(full)) || !(await fs.stat(full)).isDirectory()) {
          return `❌ Directory not found: ${full}`;
        }
        return true;
      },
    });
    return path.join(projectRoot, root);
  }
}

// Let user pick one or more families with clearer options
async function chooseFamilies(fontsRoot) {
  const subdirectories = (await fs.readdir(fontsRoot))
    .filter(d => fs.statSync(path.join(fontsRoot, d)).isDirectory() && !d.startsWith('.'));

  if (subdirectories.length === 0) {
    console.log(chalk.yellow('⚠ No font family folders found in the specified directory.'));
    process.exit(0);
  }

  const choices = [
    { name: chalk.bold('All Font Families'), value: '__ALL__' },
    new inquirer.Separator(),
    ...subdirectories.map(d => ({ name: d, value: path.join(fontsRoot, d) })),
  ];

  const { families } = await prompt({
    name: 'families',
    type: 'checkbox',
    message: 'Select the font families to include:',
    choices,
    validate: v => v.length > 0 || 'Please select at least one font family.',
  });

  if (families.includes('__ALL__')) return subdirectories.map(d => path.join(fontsRoot, d));
  return families;
}

// Ask for Tailwind CSS file with interactive file selection
async function askTailwindFile() {
  while (true) {
    const { tw } = await prompt({
      name: 'tw',
      type: 'autocomplete', // Use autocomplete for file selection
      message: 'Enter the path to your main Tailwind CSS file:',
      default: 'src/app.css',
      source: async (answersSoFar, input = '') => {
        const currentDir = projectRoot;
        const files = await fs.readdir(currentDir);
        const fuzzyResult = fuzzy.filter(input, files.filter(f => !f.startsWith('.')));
        return fuzzyResult.map(el => el.original);
      },
      validate: async (v) => {
        if (!v) return 'File path is required.';
        const fullPath = path.join(projectRoot, v);
        if (!(await fs.pathExists(fullPath)) || !(await fs.stat(fullPath)).isFile()) {
          return `❌ File not found: ${fullPath}`;
        }
        return true;
      },
    });
    return path.join(projectRoot, tw);
  }
}

// Ask for the output CSS file for Standard CSS
async function askStandardCssFile() {
  const { output } = await prompt({
    name: 'output',
    type: 'input',
    message: 'Enter the desired path for the generated fonts CSS file:',
    default: 'src/fonts.css',
  });
  return path.join(projectRoot, output);
}

// Remove all @theme and @font-face blocks for given families (improved regex)
function cleanCss(css, familyNames) {
  // Remove any @theme block entirely
  css = css.replace(/@theme\s*\{[\s\S]*?\}/g, '');

  familyNames.forEach(name => {
    // More specific regex to target our font-face blocks
    const fontFaceRegex = new RegExp(
      `\\/\\* Custom @font-face rules for ${name} \\*\\/[\\s\\S]*?(?=@theme|\\/\\* Custom @font-face rules for|$)`,
      'g'
    );
    css = css.replace(fontFaceRegex, '');

    // Also remove individual @font-face rules that might be left
    const individualFontFaceRegex = new RegExp(
      `@font-face\\s*\\{[\\s\\S]*?font-family:\\s*"${name}-[^"]+"[\\s\\S]*?\\}`,
      'g'
    );
    css = css.replace(individualFontFaceRegex, '');
  });

  // Also tidy up multiple blank lines
  css = css.replace(/\n{3,}/g, '\n\n');
  return css;
}

async function main() {
  const { cssType } = await prompt({
    name: 'cssType',
    type: 'list',
    message: 'Choose the type of CSS to generate:',
    choices: ['TailwindCSS', 'Standard CSS'],
  });

  const fontsRoot = await askFontsRoot();
  const familyDirs = await chooseFamilies(fontsRoot);
  const familyNames = familyDirs.map(fd => path.basename(fd));

  if (cssType === 'TailwindCSS') {
    const twPath = await askTailwindFile();
    let css = await fs.readFile(twPath, 'utf-8');

    const cleanMode = process.argv.includes('--clean');
    if (cleanMode) {
      css = cleanCss(css, familyNames);
      await fs.writeFile(twPath, css, 'utf-8');
      console.log(chalk.green(`🎉 Successfully removed font configurations for: ${familyNames.join(', ')}`));
      process.exit(0);
    }

    // ADD MODE:
    // Remove existing theme and custom font-face blocks to avoid duplicates
    css = css
      .replace(/@theme\s*\{[\s\S]*?\}/g, '')
      .replace(/\/\* Custom @font-face rules \*\/[\s\S]*/g, '');

    const themeLines = ['@theme {'];
    const faceLines = ['/* Custom @font-face rules */'];

    for (const familyDir of familyDirs) {
      const familyName = path.basename(familyDir).toLowerCase().replace(/ /g, '-');
      // Search for any file within the family directory
      const fontFiles = globSync(`*`, { cwd: familyDir, absolute: true });
      const actualFontFiles = fontFiles.filter(file => {
        const lowerCaseFile = file.toLowerCase();
        return lowerCaseFile.endsWith('.ttf') || lowerCaseFile.endsWith('.otf') || lowerCaseFile.endsWith('.woff') || lowerCaseFile.endsWith('.woff2');
      });

      if (!actualFontFiles.length) {
        console.warn(chalk.yellow(`⚠ No font files (ttf, otf, woff, woff2) found under ${familyName}`));
        continue;
      }

      const styleToFile = {};
      actualFontFiles.forEach(fp => {
        const base = path.basename(fp).split('.')[0];
        // Attempt to extract style from filename (e.g., Roboto-BoldItalic -> BoldItalic)
        const parts = base.split('-');
        const familyPart = parts[0].toLowerCase() === familyName ? 1 : 0; // Skip family name if present
        const style = parts.slice(familyPart).join('-').toLowerCase().replace(/_/g, '-');
        if (style) styleToFile[style] = fp;
      });

      const styles = Object.keys(styleToFile).sort();
      console.log(chalk.green(`✔ [${familyName}] Found styles: ${styles.join(', ')}`));

      // Generate Tailwind theme extensions
      themeLines.push(`  /* ${familyName} */`);
      styles.forEach(style => {
        const themeKey = `font-${familyName}-${style}`.toLowerCase().replace(/_/g, '-');
        themeLines.push(`  --${themeKey}: "${familyName}-${style}", sans-serif;`);
      });

      // Generate @font-face rules
      faceLines.push(`\n/* Custom @font-face rules for ${familyName} */`);
      styles.forEach(style => {
        const filePath = styleToFile[style];
        const url = relativeUrl(twPath, filePath);
        const fontWeight = style.includes('bold') ? '700' : (style.includes('medium') ? '500' : '400');
        const fontStyle = style.includes('italic') ? 'italic' : 'normal';
        const fontFaceName = `${familyName}-${style}`.toLowerCase().replace(/_/g, '-');
        const format = path.extname(filePath).slice(1); // Extract extension for format

        faceLines.push(
          `@font-face {`,
          `  font-family: "${fontFaceName}";`,
          `  src: url("${url}") format("${format}");`,
          `  font-weight: ${fontWeight};`,
          `  font-style: ${fontStyle};`,
          `}`,
          ''
        );
      });
    }

    themeLines.push('}', '');
    css += '\n' + themeLines.join('\n') + '\n' + faceLines.join('\n');
    await fs.writeFile(twPath, css, 'utf-8');
    console.log(chalk.green('\n🎉 Tailwind CSS font integration completed successfully!'));

  } else {
    // Standard CSS logic
    const cssOutputPath = await askStandardCssFile();
    let css = '';

    for (const familyDir of familyDirs) {
      const familyName = path.basename(familyDir).toLowerCase().replace(/ /g, '-');
      // Search for any file within the family directory
      const fontFiles = globSync(`*`, { cwd: familyDir, absolute: true });
      const actualFontFiles = fontFiles.filter(file => {
        const lowerCaseFile = file.toLowerCase();
        return lowerCaseFile.endsWith('.ttf') || lowerCaseFile.endsWith('.otf') || lowerCaseFile.endsWith('.woff') || lowerCaseFile.endsWith('.woff2');
      });

      if (!actualFontFiles.length) {
        console.warn(chalk.yellow(`⚠ No font files (ttf, otf, woff, woff2) found under ${familyName}`));
        continue;
      }

      const styleToFile = {};
      actualFontFiles.forEach(fp => {
        const base = path.basename(fp).split('.')[0];
        const parts = base.split('-');
        const familyPart = parts[0].toLowerCase() === familyName ? 1 : 0;
        const style = parts.slice(familyPart).join('-').toLowerCase().replace(/_/g, '-');
        if (style) styleToFile[style] = fp;
      });

      const styles = Object.keys(styleToFile).sort();
      console.log(chalk.green(`✔ [${familyName}] Found styles: ${styles.join(', ')}`));

      styles.forEach(style => {
        const filePath = styleToFile[style];
        const url = relativeUrl(cssOutputPath, filePath);
        const fontWeight = style.includes('bold') ? '700' : (style.includes('medium') ? '500' : '400');
        const fontStyle = style.includes('italic') ? 'italic' : 'normal';
        const fontFaceName = `${familyName}-${style}`.toLowerCase().replace(/_/g, '-');
        const className = `font-${fontFaceName}`;
        const format = path.extname(filePath).slice(1);

        // Generate @font-face
        css += `@font-face {\n`;
        css += `  font-family: "${fontFaceName}";\n`;
        css += `  src: url("${url}") format("${format}");\n`;
        css += `  font-weight: ${fontWeight};\n`;
        css += `  font-style: ${fontStyle};\n`;
        css += `}\n\n`;

        // Generate CSS class
        css += `.${className} {\n`;
        css += `  font-family: "${fontFaceName}", sans-serif;\n`;
        css += `  font-weight: ${fontWeight};\n`;
        css += `  font-style: ${fontStyle};\n`;
        css += `}\n\n`;
      });
    }

    await fs.writeFile(cssOutputPath, css, 'utf-8');
    console.log(chalk.green('\n🎉 Standard CSS font generation completed successfully!'));
  }
}

main().catch(err => {
  console.error(chalk.red('🔥 An error occurred:'), chalk.red(err.message || err));
  process.exit(1);
});