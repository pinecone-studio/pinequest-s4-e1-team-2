const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// server/ folder-ийг bundle-д оруулахгүй (Node.js proxy сервер)
const serverDir = path.join(__dirname, 'server');
const { blockList } = config.resolver;
config.resolver.blockList = Array.isArray(blockList)
  ? [...blockList, new RegExp(`^${serverDir.replace(/\\/g, '\\\\')}.*`)]
  : new RegExp(`^${serverDir.replace(/\\/g, '\\\\')}.*`);

config.resolver.assetExts.push('tflite');

module.exports = config;
