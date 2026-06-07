const { withSettingsGradle, withGradleProperties } = require('@expo/config-plugins');

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

  config = withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'org.gradle.java.home')
    );
    return config;
  });

  return config;
};
