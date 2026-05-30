const { withAppDelegate } = require('@expo/config-plugins');

/**
 * Patches bundleURL() in AppDelegate.swift to return nil in DEBUG builds.
 * This lets expo-dev-client show its launcher screen on real devices,
 * which then connects to Metro via tunnel QR code.
 * Without this, a hardcoded localhost URL causes a MIME-type error on real devices.
 */
module.exports = function withDevClientBundleURL(config) {
  return withAppDelegate(config, (config) => {
    let src = config.modResults.contents;

    // Case 1: hardcoded localhost URL (our custom AppDelegate)
    src = src.replace(
      /return URL\(string: "http:\/\/localhost:\d+[^"]*"\)/,
      'return nil  // expo-dev-client launcher handles real-device connections'
    );

    // Case 2: default prebuild uses RCTBundleURLProvider
    src = src.replace(
      /return RCTBundleURLProvider\.sharedSettings\(\)\.jsBundleURL\(forBundleRoot:[^)]+\)/,
      'return nil  // expo-dev-client launcher handles real-device connections'
    );

    config.modResults.contents = src;
    return config;
  });
};
