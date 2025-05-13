# 🚀 Font Manager for TailwindCSS

Effortlessly integrate your local fonts into TailwindCSS projects with this handy CLI tool built with Node.js and PNPM! Say goodbye to manual configuration and enjoy seamless font management. This tool automatically generates the required `font-family` classes, making your typography setup a breeze.

## ✨ Features

- **⚡️ Easy to Use**: Quickly point the tool to your local fonts folder and watch it integrate them into your TailwindCSS setup.
- **🎨 Automated Font-Class Generation**: Automatically creates TailwindCSS utility classes like `font-roboto-regular`, `font-roboto-bold`, and more.
- **📂 Supports Multiple Font Formats**: Compatible with `.ttf`, `.otf`, `.woff`, `.woff2`, and other web-friendly font formats.
- **⚙️ Seamless Integration**: Automatically updates your `tailwind.config.js` file, saving you valuable development time.
- **🔓 Open Source**: Free to use and modify for both personal and commercial endeavors.

## 🛠️ Installation

Get started with Font Manager for TailwindCSS in a few simple steps:

1. **Install PNPM** (if you haven't already):
   ```bash
   npm install -g pnpm

2.  **Clone the repository** OR **Install via NPM registry**:

      - **Cloning the repository:**

        ```bash
        git clone [https://github.com/your-username/font-manager-tailwindcss.git](https://github.com/your-username/font-manager-tailwindcss.git)
        cd font-manager-tailwindcss
        ```

      - **Installing from NPM registry:**

        ```bash
        pnpm install fontgen-cli
        ```

3.  **Install dependencies** (if you cloned the repository):

    ```bash
    pnpm install
    ```

4.  **Run the tool**:

    ```bash
    pnpm run start
    ```

    Follow the interactive prompts to specify your fonts folder and configure your TailwindCSS project.

## ⚙️ Usage

Managing your project fonts with the CLI tool is straightforward:

1.  **Run the CLI Tool**:

    ```bash
    fontgen-cli
    ```
    On any issues just fix your env vars or use pnpm fontgen-cli

2.  **Provide the path to your fonts folder**:

    ```bash
    Please provide the path to your fonts folder: /path/to/fonts
    ```

    *(Replace `/path/to/fonts` with the actual path to your font directory).*

3.  **Specify the font file(s)**:

    ```bash
    Please specify the font(s): Roboto/Roboto-Regular.ttf Roboto/Roboto-Bold.ttf
    ```

    *(List the font files you want to integrate, separated by spaces).*

4.  **Font Classes Generated**:
    The tool will automatically generate TailwindCSS classes based on your font files, such as:

      - `font-roboto-regular`
      - `font-roboto-bold`

5.  **Enjoy\!**: Your custom fonts are now integrated into your TailwindCSS project and ready for use.

## 🤝 Contributing

We warmly welcome contributions\! If you have suggestions for improvements or encounter any bugs, please don't hesitate to open an issue or submit a pull request.

### How to Contribute:

1.  Fork the repository on GitHub.
2.  Create a new branch with a descriptive name for your feature or fix.
3.  Write comprehensive tests for your changes (if applicable).
4.  Submit a well-documented pull request explaining your changes.

We appreciate your contributions and will review them promptly\!

## 🧪 Testing

To ensure the tool functions as expected, you can run the provided tests:

```bash
pnpm run test
```

This command will execute the test suite and verify the tool's functionality.

**For contributors**: Please include tests for any new features or bug fixes in your pull requests.

## 🐛 Troubleshooting

### "Error: Font folder is empty."

  - Double-check that the provided folder path is correct.
  - Ensure that the specified folder contains valid font files (e.g., `.ttf`, `.woff2`).

### "TailwindCSS classes are not being applied."

  - Verify that TailwindCSS is correctly configured in your project.
  - After running the tool, you might need to restart your development server for the changes in `tailwind.config.js` to take effect.

### "Font styles are not being recognized."

  - Ensure that the file paths for each font style within your fonts folder are accurate.
  - The generated TailwindCSS classes (`font-roboto-regular`, `font-roboto-bold`, etc.) are derived from the font file names. Make sure your class names in your HTML/CSS match these generated names.

## 🔗 Appendix

### Related Resources

  - [Tailwind CSS Documentation](https://tailwindcss.com/) - The official documentation for the utility-first CSS framework.
  - [PNPM Documentation](https://pnpm.io/) - Learn more about the fast and efficient package manager.

### License

This project is licensed under the **GNU General Public License v3.0**. For full details, please refer to the [LICENSE](https://www.google.com/search?q=./LICENSE) file.