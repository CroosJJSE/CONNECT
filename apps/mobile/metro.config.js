const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const mobileReact = path.resolve(projectRoot, 'node_modules/react');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = false;
config.resolver.extraNodeModules = {
  '@connect-core': path.resolve(workspaceRoot, 'src'),
  react: mobileReact,
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  '@react-native-async-storage/async-storage': path.resolve(
    projectRoot,
    'node_modules/@react-native-async-storage/async-storage'
  ),
  '@expo/vector-icons': path.resolve(projectRoot, 'node_modules/@expo/vector-icons'),
  'expo-font': path.resolve(projectRoot, 'node_modules/expo-font'),
  firebase: path.resolve(projectRoot, 'node_modules/firebase'),
  'expo-auth-session': path.resolve(projectRoot, 'node_modules/expo-auth-session'),
  'expo-web-browser': path.resolve(projectRoot, 'node_modules/expo-web-browser'),
  'expo-crypto': path.resolve(projectRoot, 'node_modules/expo-crypto'),
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    return context.resolveRequest(
      {
        ...context,
        originModulePath: path.join(projectRoot, 'package.json'),
        resolveRequest: defaultResolveRequest,
      },
      moduleName,
      platform
    );
  }
  if (typeof defaultResolveRequest === 'function') {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
