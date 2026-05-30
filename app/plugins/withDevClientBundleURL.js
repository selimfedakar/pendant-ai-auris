const { withAppDelegate } = require('@expo/config-plugins');

/**
 * Patches bundleURL() in AppDelegate.swift to return nil in DEBUG builds.
 * expo-dev-client then shows its launcher screen on real devices (no hardcoded URL).
 *
 * Handles all Expo SDK 56 / RN 0.85 AppDelegate formats robustly.
 */
module.exports = function withDevClientBundleURL(config) {
  return withAppDelegate(config, (config) => {
    let src = config.modResults.contents;

    // Skip if already patched
    if (src.includes('return nil') && src.includes('bundleURL')) {
      return config;
    }

    // Locate the bundleURL() function and replace its body entirely.
    // Uses brace counting to find the exact closing } regardless of content.
    const fnSignature = 'override func bundleURL() -> URL?';
    const fnStart = src.indexOf(fnSignature);

    if (fnStart !== -1) {
      const openBrace = src.indexOf('{', fnStart);
      if (openBrace !== -1) {
        let depth = 0;
        let closeBrace = -1;
        for (let i = openBrace; i < src.length; i++) {
          if (src[i] === '{') depth++;
          else if (src[i] === '}') {
            depth--;
            if (depth === 0) { closeBrace = i; break; }
          }
        }

        if (closeBrace !== -1) {
          const indentMatch = src.slice(0, fnStart).match(/[ \t]*$/);
          const indent = indentMatch ? indentMatch[0] : '  ';

          const replacement =
            `${fnSignature} {\n` +
            `#if DEBUG\n` +
            `${indent}  return nil  // expo-dev-client launcher handles real-device connections\n` +
            `#else\n` +
            `${indent}  return Bundle.main.url(forResource: "main", withExtension: "jsbundle")\n` +
            `#endif\n` +
            `${indent}}`;

          src = src.slice(0, fnStart) + replacement + src.slice(closeBrace + 1);
          config.modResults.contents = src;
          return config;
        }
      }
    }

    // Fallback: handle simple single-line returns not inside bundleURL override
    src = src.replace(
      /return URL\(string: "http:\/\/localhost:\d+[^"]*"\)/,
      'return nil  // expo-dev-client launcher handles real-device connections'
    );
    src = src.replace(
      /return RCTBundleURLProvider\.sharedSettings\(\)\.jsBundleURL\(forBundleRoot:[^)]+\)/,
      'return nil  // expo-dev-client launcher handles real-device connections'
    );

    config.modResults.contents = src;
    return config;
  });
};
