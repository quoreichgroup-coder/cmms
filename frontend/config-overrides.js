// config-overrides.js
const { codeInspectorPlugin } = require('code-inspector-plugin');
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

const preparePdfiumWorker = () => {
  const converterDirectory = path.dirname(require.resolve('@pdfme/converter'));
  const workerDirectory = path.join(converterDirectory, 'assets');
  const workerFile = fs.readdirSync(workerDirectory).find((file) =>
    /^clawpdf-worker-.*\.js$/.test(file)
  );
  // clawpdf exports only ESM entry points, so resolve its installed asset by
  // the locked npm dependency layout instead of require.resolve().
  const wasmFile = path.resolve(
    converterDirectory,
    '../../../clawpdf/dist/vendor/pdfium.esm.wasm'
  );

  if (!workerFile || !fs.existsSync(wasmFile)) {
    throw new Error('Unable to locate the pdfme PDFium worker or WebAssembly binary.');
  }

  const wasmBinary = fs.readFileSync(wasmFile);
  const wasmHash = createHash('sha256').update(wasmBinary).digest('hex').slice(0, 12);
  const wasmAssetName = `pdfium.esm.${wasmHash}.wasm`;
  const workerPath = path.join(workerDirectory, workerFile);
  const workerSource = fs.readFileSync(workerPath, 'utf8');
  const inlineWasmUrl = /new URL\("data:application\/wasm;base64,[A-Za-z0-9+/=]+", "" \+ self\.location\.href\)\.href;/g;
  const externalWasmUrl = `new URL("${wasmAssetName}", self.location.href).href`;

  const externalizedWorkerSource = workerSource.replace(inlineWasmUrl, externalWasmUrl);
  if (externalizedWorkerSource === workerSource && !workerSource.includes(externalWasmUrl)) {
    throw new Error('The pdfme worker format changed; review the PDFium asset patch before building.');
  }
  if (externalizedWorkerSource !== workerSource) {
    fs.writeFileSync(workerPath, externalizedWorkerSource);
  }

  return { wasmBinary, wasmAssetName };
};

module.exports = {
  webpack: function override(config, env) {
    // pdfme's browser worker bundles clawpdf's shared code, which retains
    // guarded Node-only imports for its Node runtime. Webpack treats `node:`
    // as a URI scheme before aliases are considered, so ignore only these
    // built-ins; the worker's browser code never enters those Node branches.
    const webpack = require('webpack');
    const { wasmBinary, wasmAssetName } = preparePdfiumWorker();
    config.plugins.push({
      apply(compiler) {
        compiler.hooks.thisCompilation.tap('QpmPdfiumWasmAssetPlugin', (compilation) => {
          compilation.hooks.processAssets.tap(
            {
              name: 'QpmPdfiumWasmAssetPlugin',
              stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
            },
            () => {
              const assetPath = `static/media/${wasmAssetName}`;
              if (!compilation.getAsset(assetPath)) {
                compilation.emitAsset(assetPath, new webpack.sources.RawSource(wasmBinary));
              }
            }
          );
        });
      }
    });
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp:
          /^node:(?:crypto|fs(?:\/promises)?|module|path|url|zlib)$/
      })
    );

    // Optional low-memory production builds for constrained VPS/CI workers.
    // The Docker build runs `npm run typecheck` separately before bundling, so
    // skip CRA's concurrent checker here and avoid holding two TypeScript
    // programs in memory alongside Webpack. Bundle output remains unchanged.
    if (env === 'production' && process.env.QPM_LOW_MEMORY_BUILD === '1') {
      config.plugins = config.plugins.filter(
        (plugin) => plugin.constructor?.name !== 'ForkTsCheckerWebpackPlugin'
      );
      config.optimization.minimizer.forEach((minimizer) => {
        if (minimizer.constructor?.name === 'TerserPlugin') {
          minimizer.options.parallel = false;
        }
      });
    }
    if (env === 'development') {
      config.plugins.push(
        codeInspectorPlugin({
          bundler: 'webpack',
          editor: 'idea',
          hotKeys: ['altKey']
        })
      );
    }
    if (env === 'production' && process.env.SENTRY_AUTH_TOKEN) {
      const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');
      config.plugins.push(
        sentryWebpackPlugin({
          org: process.env.SENTRY_ORG,
          project: 'frontend',
          authToken: process.env.SENTRY_AUTH_TOKEN,
          release: {
            name:
              process.env.REACT_APP_SENTRY_RELEASE || 'qpm-frontend',
            create: true
          }
        })
      );
    }
    return config;
  },

  devServer: function (configFunction) {
    return function (proxy, allowedHost) {
      const config = configFunction(proxy, allowedHost);
      config.proxy = {
        '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
        '/storage': { target: 'http://127.0.0.1:3000', changeOrigin: true }
      };
      config.client = {
        ...config.client,
        overlay: false
      };

      return config;
    };
  }
};
