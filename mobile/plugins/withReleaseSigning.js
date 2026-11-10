/**
 * Expo config plugin: signs Android release builds with the SubShuffle upload/release key.
 *
 * Secrets are NEVER written into the generated Gradle files. Instead, `android/app/build.gradle`
 * reads them from environment variables at build time:
 *
 *   ANDROID_KEYSTORE_PATH      absolute path to the decoded .jks keystore
 *   ANDROID_KEYSTORE_PASSWORD  keystore password
 *   ANDROID_KEY_ALIAS          key alias (e.g. subshuffle-release)
 *   ANDROID_KEY_PASSWORD       key password
 *
 * If ANDROID_KEYSTORE_PATH is not set (e.g. a local developer build), the release build falls
 * back to the debug signing config so `./gradlew assembleRelease` still works offline.
 *
 * The release key's SHA-1 / SHA-256 fingerprints are registered on the Firebase Android app
 * (`com.subshuffle.app`) so native Google Sign-In accepts tokens from release APKs.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// @subshuffle/release-signing';

const RELEASE_SIGNING_CONFIG = `
        ${MARKER}
        release {
            if (System.getenv('ANDROID_KEYSTORE_PATH')) {
                storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEY_PASSWORD')
            }
        }`;

function applyReleaseSigning(gradle) {
  if (gradle.includes(MARKER)) {
    return gradle;
  }

  // 1. Add a `release` entry to the signingConfigs block (right after `signingConfigs {`).
  const signingConfigsRe = /signingConfigs\s*\{/;
  if (!signingConfigsRe.test(gradle)) {
    throw new Error('[withReleaseSigning] Could not find signingConfigs block in app/build.gradle');
  }
  let out = gradle.replace(signingConfigsRe, (m) => `${m}${RELEASE_SIGNING_CONFIG}`);

  // 2. Point the `release` build type at the release signing config (falling back to debug).
  const releaseBuildTypeRe =
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/;
  if (!releaseBuildTypeRe.test(out)) {
    throw new Error(
      '[withReleaseSigning] Could not find `signingConfig signingConfigs.debug` in the release build type'
    );
  }
  out = out.replace(
    releaseBuildTypeRe,
    (_m, prefix) =>
      `${prefix}signingConfig System.getenv('ANDROID_KEYSTORE_PATH') ? signingConfigs.release : signingConfigs.debug`
  );

  return out;
}

const withReleaseSigning = (config) =>
  withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('[withReleaseSigning] Only Groovy app/build.gradle is supported');
    }
    cfg.modResults.contents = applyReleaseSigning(cfg.modResults.contents);
    return cfg;
  });

module.exports = withReleaseSigning;
module.exports.applyReleaseSigning = applyReleaseSigning;
