const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const sharedSrc = path.resolve(workspaceRoot, "packages/shared/src");

const config = getDefaultConfig(projectRoot);

config.watchFolders = Array.from(
  new Set([
    ...(config.watchFolders ?? []),
    path.resolve(workspaceRoot, "packages"),
    path.resolve(workspaceRoot, "node_modules"),
  ])
);

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "@berber/shared": sharedSrc,
};

module.exports = config;
