// config-overrides.js
const { codeInspectorPlugin } = require('code-inspector-plugin');

module.exports = {
  webpack: function override(config, env) {
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
