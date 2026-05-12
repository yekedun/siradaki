const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const sharedSrc = path.resolve(workspaceRoot, "packages/shared/src");

const config = getDefaultConfig(projectRoot);

config.watchFolders = Array.from(
  new Set([...(config.watchFolders ?? []), path.resolve(workspaceRoot, "packages")])
);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "@berber/shared": sharedSrc,
};

module.exports = config;
