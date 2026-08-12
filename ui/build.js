const fs = require("fs");
const path = require("path");
const cssModulesPlugin = require("esbuild-css-modules-plugin");

const outdir = path.resolve(
  __dirname,
  "..",
  "server",
  "src",
  "main",
  "resources",
  "ui",
  "static",
  "dist"
);

const isDevelopment = process.argv.includes("--dev");
const isWatch = process.argv.includes("--watch");

// Monaco is not part of the bundle: @monaco-editor/react loads it at RUNTIME with its own AMD
// loader, whose default base is cdn.jsdelivr.net. That makes every code editor in Dekaf depend on
// the public internet - it never mounts at all without it. Ship the same files next to the bundle
// and point the loader at them (see loader.config in components/ui/CodeEditor/CodeEditor.tsx).
const copyMonaco = () => {
  const from = path.resolve(__dirname, "node_modules", "monaco-editor", "min", "vs");
  fs.cpSync(from, path.join(outdir, "vs"), { recursive: true });
};

require("esbuild")
  .build({
    target: ["chrome100"],
    entryPoints: ["entrypoint.tsx"],
    bundle: true,
    loader: {
      ".svg": "text",
      ".md": "text",
      ".png": "dataurl",
    },
    minify: !isDevelopment,
    globalName: "pulsarUiEntrypoint",
    sourcemap: isDevelopment ? "both" : false,
    // sourcemap: false,
    outdir,
    plugins: [
      cssModulesPlugin({
        usePascalCase: true,
        v2: true,
      }),
    ],
    define: {
      "process.env.NODE_ENV": isDevelopment ? '"development"' : '"production"',
    },
    watch: isWatch,
    logLevel: "info",
  })
  .then(copyMonaco)
  .catch((err) => {
    // Log before exiting: a bare `process.exit(1)` turns a bundle error or a missing
    // `monaco-editor/min/vs` (the copyMonaco cpSync) into a silent failed exit with nothing to
    // diagnose from.
    console.error(err);
    process.exit(1);
  });
