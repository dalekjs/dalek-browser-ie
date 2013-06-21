// Copyright 2013 The Obvious Corporation.

/**
 * @fileoverview Helpers made available via require('dalek-browser-ie') once package is
 * installed.
 */

var path = require('path')


/**
 * Where the iedriverserver binary can be found.
 * @type {string}
 */
exports.path = path.join(__dirname, 'bin', 'IEDriverServer.exe');


/**
 * The version of iedriverserver installed by this package.
 * @type {number}
 */
exports.version = '23.0.0'
