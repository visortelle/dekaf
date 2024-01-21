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
  .catch(() => process.exit(1));
