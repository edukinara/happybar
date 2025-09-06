const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude problematic Prisma paths
config.resolver.blockList = [
  /.*\/packages\/database\/.*/,
  /.*\/@prisma\/.*/,
  /.*\/prisma\/.*/,
];

// Configure for monorepo
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { 
  input: './global.css'
});