const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.extraNodeModules = {
  '@connect-core': path.resolve(workspaceRoot, 'src'),
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  '@react-native-async-storage/async-storage': path.resolve(
    projectRoot,
    'node_modules/@react-native-async-storage/async-storage'
  ),
  '@expo/vector-icons': path.resolve(projectRoot, 'node_modules/@expo/vector-icons'),
  'expo-font': path.resolve(projectRoot, 'node_modules/expo-font'),
};
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
