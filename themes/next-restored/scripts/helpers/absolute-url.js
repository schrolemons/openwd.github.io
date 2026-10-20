'use strict';

const { URL } = require('node:url');

// Relative paths and fragments have no external host. Do not resolve them
// against a base URL, which would change how the theme classifies links.
module.exports = function(value) {
  try {
    return new URL(value);
  } catch (error) {
    if (error.code !== 'ERR_INVALID_URL') throw error;
    return null;
  }
};
