// config-overrides.js
const { codeInspectorPlugin } = require('code-inspector-plugin');

module.exports = {
  webpack: function override(config, env) {
    // pdfme's browser worker bundles clawpdf's shared code, which retains
    // guarded Node-only imports for its Node runtime. Webpack treats `node:`
    // as a URI scheme before aliases are considered, so ignore only these
    // built-ins; the worker's browser code never enters those Node branches.
    const webpack = require('webpack');
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp:
          /^node:(?:crypto|fs(?:\/promises)?|module|path|url|zlib)$/
      })
    );

    // Optional low-memory production builds for constrained VPS/CI workers.
    // This changes minifier parallelism only, not the generated application code.
    if (env === 'production' && process.env.QPM_LOW_MEMORY_BUILD === '1') {
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
              process.env.REACT_APP_SENTRY_RELEASE || 'atlas-frontend',
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
