const { withSettingsGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withNitroModules(config) {
  config = withSettingsGradle(config, (config) => {
    const nitroInclude = [
      "include ':react-native-nitro-modules'",
      "project(':react-native-nitro-modules').projectDir = new File(rootDir, '../node_modules/react-native-nitro-modules/android')",
    ].join('\n');

    if (!config.modResults.contents.includes('react-native-nitro-modules')) {
      config.modResults.contents += '\n' + nitroInclude + '\n';
    }

    return config;
  });

  config = withDangerousMod(config, [
    'android',
    (config) => {
      const gradlePropsPath = path.join(
        config.modRequest.platformProjectRoot,
        'gradle.properties'
      );
      if (fs.existsSync(gradlePropsPath)) {
        let contents = fs.readFileSync(gradlePropsPath, 'utf-8');
        contents = contents.replace(/^org\.gradle\.java\.home=.*\n?/m, '');
        fs.writeFileSync(gradlePropsPath, contents);
      }
      return config;
    },
  ]);

  return config;
};
