const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace root
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the entire workspace
config.watchFolders = [workspaceRoot];

// 2. Map metro cache to workspace, to ensure we use workspace modules
config.projectRoot = projectRoot;

// 3. Force resolver to use workspace root node_modules for React
config.resolver.alias = {
  'react': path.resolve(workspaceRoot, 'node_modules/react'),
  'react-native': path.resolve(workspaceRoot, 'node_modules/react-native'),
};

// 4. Make Metro look for modules in both project and workspace node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 5. Exclude entire database package and all Prisma-related content
config.resolver.blacklistRE = /packages\/database|@prisma|prisma/;

module.exports = config;
