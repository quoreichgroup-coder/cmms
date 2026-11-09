// Shared checker: every literal t('key') used in source must exist in the en and fr locales.
// Used by frontend/scripts/i18n-keys.test.cjs and mobile/scripts/i18n-keys.test.cjs.
const fs = require('fs');
const path = require('path');
const Module = require('module');

function loadLocale(file, ts) {
  const cache = new Map();
  const load = (absPath) => {
    const resolved = fs.existsSync(absPath) ? absPath : `${absPath}.ts`;
    if (cache.has(resolved)) return cache.get(resolved).exports;
    const source = fs.readFileSync(resolved, 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }
    });
    const mod = new Module(resolved);
    cache.set(resolved, mod);
    mod.require = (request) =>
      request.startsWith('.') ? load(path.resolve(path.dirname(resolved), request)) : require(request);
    mod._compile(outputText, resolved);
    return mod.exports;
  };
  const exported = load(file);
  return exported.default || exported;
}

function listSources(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '__tests__', 'i18n', 'android', 'ios', 'dist', 'build'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listSources(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
  }
  return out;
}

const T_CALL = /(?<![\w.])(?:t|i18n\.t)\(\s*(['"])([A-Za-z0-9_.\- ]+)\1\s*(,|\))/g;

function findMissingKeys({ sourceDirs, enFile, frFile, ts, root }) {
  const en = loadLocale(enFile, ts);
  const fr = loadLocale(frFile, ts);
  const missing = [];
  for (const dir of sourceDirs) {
    for (const file of listSources(dir)) {
      const text = fs.readFileSync(file, 'utf8');
      for (const match of text.matchAll(T_CALL)) {
        const key = match[2];
        const line = text.slice(0, match.index).split('\n').length;
        const where = `${path.relative(root, file)}:${line}`;
        const has = (locale) =>
          key in locale || `${key}_one` in locale || `${key}_other` in locale || `${key}_plural` in locale;
        if (!has(en)) missing.push({ key, locale: 'en', where });
        if (!has(fr)) missing.push({ key, locale: 'fr', where });
      }
    }
  }
  return missing;
}

module.exports = { findMissingKeys, loadLocale };
