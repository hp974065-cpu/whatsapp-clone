const { getDefaultConfig } = require("expo/metro-config");
let withNativeWind;
try {
    withNativeWind = require("nativewind/metro-config").withNativeWind;
} catch (e) {
    console.warn("NativeWind metro-config failed to load, falling back to default.");
}

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind
    ? withNativeWind(config, { input: "./global.css" })
    : config;
