const path = require('path');
const cssModulesPlugin = require("esbuild-css-modules-plugin");

const outdir = path.resolve(__dirname, '..', 'server', 'src', 'main', 'resources', 'ui', 'static');

require("esbuild")
  .build({
    target: ["chrome100"],
    entryPoints: ["entrypoint.tsx"],
    bundle: true,
    loader: {
      ".svg": "text",
    },
    globalName: "pulsarUiEntrypoint",
    sourcemap: true,
    outdir,
    plugins: [
      cssModulesPlugin({
        usePascalCase: true,
        v2: true
      }),
    ],
  })
  .catch(() => process.exit(1));
