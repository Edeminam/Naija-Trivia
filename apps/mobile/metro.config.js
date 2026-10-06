const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Node-only modules pulled in by @colyseus/sdk's fallback transport. React Native has a global WebSocket.
const EMPTY = path.resolve(__dirname, "shims/empty.js");
const NODE_ONLY = new Set(["ws"]);
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (NODE_ONLY.has(moduleName)) return { type: "sourceFile", filePath: EMPTY };
  return upstream ? upstream(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./src/global.css" });
