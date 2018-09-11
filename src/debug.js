'use strict';

const debugPackage = require('debug');

function debug (tag, message) {
  debugPackage(tag)(message);
}

module.exports = debug;
