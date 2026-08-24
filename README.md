# Fontgen CLI

A CLI tool for managing fonts in Tailwind CSS projects.

Fontgen scans local font files and generates the required `font-family` utilities for Tailwind automatically. This removes much of the manual setup normally required when adding custom fonts.

## Features

* Simple workflow: point the tool to a fonts directory and integrate them into your Tailwind project.
* Automatic class generation such as `font-roboto-regular` and `font-roboto-bold`.
* Supports common font formats including `.ttf`, `.otf`, `.woff`, and `.woff2`.
* Updates your Tailwind CSS entry file or writes a standalone CSS file automatically.
* Open source and free for personal or commercial use.

## Installation

### 1. Install Bun (if needed)

See the official documentation: [https://bun.sh/](https://bun.sh/)

### 2. Install Fontgen CLI

You can either clone the repository or install it from the npm registry.

**Clone the repository**

```bash
git clone https://github.com/hypocalcemia/fontgen-cli.git
cd fontgen-cli
npm install
```

**Install from npm registry**

```bash
npm install -g fontgen-cli
```

### 3. Run the tool

```bash
npm start
```

Follow the prompts to configure your fonts directory and Tailwind project.

## Usage

### 1. Run the CLI

```bash
fontgen-cli
```

If the command fails, verify your environment or run it through Node:

```bash
node ./index.js
```

### 2. Provide a fonts directory

Example:

```bash
Please provide the path to your fonts folder: /path/to/fonts
```

### 3. Specify the font files

Example:

```bash
Please specify the font(s): Roboto/Roboto-Regular.ttf Roboto/Roboto-Bold.ttf
```

List multiple files separated by spaces.

### 4. Generated classes

Fontgen generates Tailwind utilities based on the file names. For example:

* `font-roboto-regular`
* `font-roboto-bold`

These classes can be used directly in your project.

## Contributing

Contributions are welcome. Open an issue or submit a pull request if you find a bug or have improvements.

Workflow:

1. Fork the repository.
2. Create a branch for your change.
3. Add tests when appropriate.
4. Submit a pull request with a clear description of the change.

## Testing

Run the test suite with:

```bash
npm test
```

Include tests for new features or bug fixes.

## Troubleshooting

**Error: "Font folder is empty."**

* Verify the folder path is correct.
* Ensure the folder contains valid font files such as `.ttf` or `.woff2`.

**Tailwind classes are not applied**

* Confirm Tailwind is correctly configured.
* Restart the development server after `base.css` (V4) changes.

**Font styles are not recognized**

* Check that font file paths are correct.
* Generated class names are derived from the file names. Make sure the classes used in HTML or CSS match the generated names.

## Appendix

### Related resources

* Tailwind CSS documentation: [https://tailwindcss.com](https://tailwindcss.com)
* Bun documentation: [https://bun.sh/](https://bun.sh/)

### License

This project is licensed under the **GNU General Public License v3.0**. See the `LICENSE` file for details.
