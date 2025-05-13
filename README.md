### 1. **Introduction**

Provide a short overview of your tool and what it does. This section should grab attention and describe the value of your project.

```markdown
# Font Manager for TailwindCSS

An awesome CLI tool built with Node.js and PNPM to manage fonts in your TailwindCSS project! Easily add local fonts from a specified folder and integrate them into your TailwindCSS setup without hassle. This tool automatically creates the necessary font-family classes for use with TailwindCSS, making your font management smooth and effortless.
```

### 2. **Features**

Highlight the key features of your project to give users a quick overview of what they can expect.

```markdown
## Features

- 🚀 **Easy to Use**: Quickly specify your local fonts folder and get them integrated into your TailwindCSS setup.
- 🎨 **Automated Font-Class Generation**: Automatically creates TailwindCSS classes like `font-roboto-regular`, `font-roboto-bold`, etc.
- 🧑‍💻 **Supports Multiple Font Formats**: Works with `.ttf`, `.otf`, `.woff`, `.woff2`, and other web-safe font formats.
- 🔄 **Seamless Integration**: Automatically updates the `tailwind.config.js` file for you, saving you time.
- 🔒 **Open Source**: Fully open-source and free to use for personal or commercial projects.
```

### 3. **Installation**

Provide installation instructions that are easy to follow.

````markdown
## Installation

To install and use the Font Manager for TailwindCSS, follow these steps:

1. **Install PNPM (if you don’t have it already)**:
   ```bash
   npm install -g pnpm
````

2. **Clone the repository OR Install through NPM registry!**:

   ```bash
   git clone https://github.com/your-username/font-manager-tailwindcss.git
   cd font-manager-tailwindcss
   ```
   ** You can ALSO just use
   ```
      pnpm install fontgen-cli
   ```

4. **Install dependencies**:

   ```bash
   pnpm install .
   ```

5. **Run the tool**:

   ```bash
   pnpm run start
   ```

   Follow the prompts to specify your fonts folder and configure your TailwindCSS project.

````

### 4. **Usage**
   Walk the user through how to use the tool step-by-step with examples.

```markdown
## Usage

Once you have the CLI tool set up, you can use it to manage fonts for your TailwindCSS project.

1. **Run the CLI Tool**:
   ```bash
   pnpm run manage-fonts
````

2. **Provide the path to your fonts folder** (e.g., `/path/to/fonts`):

   ```bash
   Please provide the path to your fonts folder: /path/to/fonts
   ```

3. **Specify the font file(s)** (e.g., `Roboto/Roboto-Regular.ttf`, `Roboto/Roboto-Bold.ttf`):

   ```bash
   Please specify the font(s): Roboto/Roboto-Regular.ttf Roboto/Roboto-Bold.ttf
   ```

4. **Font Classes Generated**:
   The tool will create Tailwind classes like:

   * `font-roboto-regular`
   * `font-roboto-bold`

5. **Done!**: Your fonts are now integrated and ready to be used in your project with TailwindCSS.

````

### 5. **Contributing**
   Encourage others to contribute to your project with clear guidelines on how to contribute.

```markdown
## Contributing

We welcome contributions! If you have ideas for improvements or want to report bugs, feel free to open an issue or submit a pull request.

### How to Contribute:

1. Fork the repository.
2. Create a new branch for your feature or fix.
3. Write tests for your changes (if applicable).
4. Submit a pull request with a clear description of what you’ve done.

We appreciate any contributions and will review pull requests in a timely manner!
````

### 6. **Testing**

Provide instructions on how to run tests to ensure the tool works as expected.

````markdown
## Testing

To run tests for this project, make sure you have all dependencies installed and run the following command:

```bash
pnpm run test
````

This will execute the test suite and verify that everything is working correctly.

For new contributors: If you’re submitting a pull request, please include tests for any new features or bug fixes.

````

### 7. **Troubleshooting**
   Provide a section to help users troubleshoot common issues.

```markdown
## Troubleshooting

### I get an error saying the font folder is empty.

Make sure that the folder you provided contains valid font files (e.g., `.ttf`, `.woff2`). Check the folder path to ensure it's correct.

### TailwindCSS classes are not being applied.

Ensure you have properly configured TailwindCSS in your project. The tool automatically updates the `tailwind.config.js` file, but you may need to restart your development server to see the changes.

### Font styles not being recognized.

Ensure you've specified the correct path for each font style in your fonts folder. The tool creates classes like `font-roboto-regular`, `font-roboto-bold`, etc., based on the font file names.
````

### 8. **Appendix**

You can add any additional information here, such as external links, related resources, or tips.

```markdown
## Appendix

### Related Tools

- [TailwindCSS](https://tailwindcss.com/) - The utility-first CSS framework that makes it easy to design custom user interfaces.
- [PNPM](https://pnpm.io/) - A fast and disk space-efficient package manager.

### License

This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](./LICENSE) file for more information.
```

### 9. **License**

Always include the licensing information clearly at the end of your README.

```markdown
## License

This project is licensed under the **GNU General Public License v3.0** – see the [LICENSE](./LICENSE) file for details.
```

---

### Putting it All Together:

````markdown
# Font Manager for TailwindCSS

An awesome CLI tool built with Node.js and PNPM to manage fonts in your TailwindCSS project! Easily add local fonts from a specified folder and integrate them into your TailwindCSS setup without hassle. This tool automatically creates the necessary font-family classes for use with TailwindCSS, making your font management smooth and effortless.

## Features

- 🚀 **Easy to Use**: Quickly specify your local fonts folder and get them integrated into your TailwindCSS setup.
- 🎨 **Automated Font-Class Generation**: Automatically creates TailwindCSS classes like `font-roboto-regular`, `font-roboto-bold`, etc.
- 🧑‍💻 **Supports Multiple Font Formats**: Works with `.ttf`, `.otf`, `.woff`, `.woff2`, and other web-safe font formats.
- 🔄 **Seamless Integration**: Automatically updates the `tailwind.config.js` file for you, saving you time.
- 🔒 **Open Source**: Fully open-source and free to use for personal or commercial projects.

## Installation

1. Install PNPM (if you don’t have it already):
   ```bash
   npm install -g pnpm
````

2. Clone the repository:

   ```bash
   git clone https://github.com/your-username/font-manager-tailwindcss.git
   cd font-manager-tailwindcss
   ```

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Run the tool:

   ```bash
   pnpm run start
   ```

## Usage

1. **Run the CLI Tool**:

   ```bash
   pnpm run manage-fonts
   ```

2. **Provide the path to your fonts folder**:

   ```bash
   Please provide the path to your fonts folder: /path/to/fonts
   ```

3. **Specify the font file(s)**:

   ```bash
   Please specify the font(s): Roboto/Roboto-Regular.ttf Roboto/Roboto-Bold.ttf
   ```

4. **Font Classes Generated**:
   The tool will create Tailwind classes like:

   * `font-roboto-regular`
   * `font-roboto-bold`

5. **Done!**: Your fonts are now integrated and ready to be used in your project with TailwindCSS.

## Contributing

We welcome contributions! If you have ideas for improvements or want to report bugs, feel free to open an issue or submit a pull request.

### How to Contribute:

1. Fork the repository.
2. Create a new branch for your feature or fix.
3. Write tests for your changes (if applicable).
4. Submit a pull request with a clear description of what you’ve done.

We appreciate any contributions and will review pull requests in a timely manner!

## Testing

To run tests for this project, make sure you have all dependencies installed and run the following command:

```bash
pnpm run test
```

This will execute the test suite and verify that everything is working correctly.

## Troubleshooting

### I get an error saying the font folder is empty.

Make sure that the folder you provided contains valid font files (e.g., `.ttf`, `.woff2`). Check the folder path to ensure it's correct.

### TailwindCSS classes are not being applied.

Ensure you have properly configured TailwindCSS in your project. The tool automatically updates the `tailwind.config.js` file, but you may need to restart your development server to see the changes.

### Font styles not being recognized.

Ensure you've specified the correct path for each font style in your fonts folder. The tool creates classes like `font-roboto-regular`, `font-roboto-bold`, etc., based on the font file names.

## Appendix

### Related Tools

* [TailwindCSS](https://tailwindcss.com/)
* [PNPM](https://pnpm.io/)

### License

This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](./LICENSE) file for more information.
