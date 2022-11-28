const path = require('path');

const outdir = path.resolve(__dirname, '..', 'server', 'src', 'main', 'resources', 'ui', 'static');

require("esbuild")
  .build({
    target: 'es2018',
    entryPoints: ["entrypoint.tsx"],
    bundle: true,
    loader: {
      '.svg': 'text',
    },
    globalName: 'app',
    minify: true,
    sourcemap: true,
    outdir
  })
  .catch(() => process.exit(1));
