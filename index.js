/*!
 *
 * Copyright (c) 2013 Sebastian Golasch
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

'use strict';

// ext. libs
var Q = require('q');
var cp = require('child_process');
var portscanner = require('portscanner');

// int. libs
var iedriver = require('./lib/iedriver');

/**
 * This module is a browser plugin for [DalekJS](//github.com/dalekjs/dalek).
 * It provides all a WebDriverServer & browser launcher for Internet Explorer.
 *
 * The browser plugin can be installed with the following command:
 *
 * ```bash
 * $ npm install dalek-browser-ie --save-dev
 * ```
 *
 * You can use the browser plugin by adding a config option to the your Dalekfile
 *
 * ```javascript
 * "browsers": ["IE"]
 * ```
 *
 * Or you can tell Dalek that it should test in this browser via the command line:
 *
 * ```bash
 * $ dalek mytest.js -b IE
 * ```
 *
 * The Webdriver Server tries to open Port 5555 by default,
 * if this port is blocked, it tries to use a port between 5555 & 5564
 * You can specifiy a different port from within your [Dalekfile](/pages/config.html) like so:
 *
 * ```javascript
 * "browsers": {
 *   "ie": {
 *     "port": 6555 
 *   }
 * }
 * ```
 *
 * It is also possible to specify a range of ports:
 *
 * ```javascript
 * "browsers": {
 *   "ie": {
 *     "portRange": [6100, 6120] 
 *   }
 * }
 * ```
 * 
 * @module DalekJS
 * @class InternetExplorer
 * @namespace Browser
 * @part InternetExplorer
 * @api
 */

var InternetExplorer = {

  /**
   * Verbose version of the browser name
   *
   * @property longName
   * @type string
   * @default Internet Explorer
   * @api
   */

  longName: 'Internet Explorer',

  /**
   * Default port of the IEDriverServer
   * The port may change, cause the port conflict resultion
   * tool might pick another one, if the default one is blocked
   *
   * @property port
   * @type integer
   * @default 5555
   */

  port: 5555,

  /**
   * Default maximum port of the IEDriverServer
   * The port is the highest port in the range that can be allocated
   * by the IEDriverServer
   *
   * @property maxPort
   * @type integer
   * @default 5654
   */

  maxPort: 5654,

  /**
   * Default host of the IEDriverServer
   * The host may be overridden with
   * a user configured value
   *
   * @property host
   * @type string
   * @default localhost
   */

  host: 'localhost',

  /**
   * Default desired capabilities that should be
   * transferred when the browser session gets requested
   *
   * @property desiredCapabilities
   * @type object
   */

  desiredCapabilities: {
    browserName: 'InternetExplorer',
    initialBrowserUrl: ''
  },

  /**
   * Driver defaults, what should the driver be able to access.
   *
   * @property driverDefaults
   * @type object
   */

  driverDefaults: {
    viewport: true,
    status: true,
    sessionInfo: true
  },

  /**
   * Path to the IEDriverServer.exe file
   *
   * @property path
   * @type string
   * @default /
   */

  path: '/',

  /**
   * Child process instance of the IEDriverServer
   *
   * @property spawned
   * @type null|Object
   */

  spawned: null,

  /**
   * IE processes that are running on startup,
   * and therefor shouldn`t be closed
   *
   * @property openProcesses
   * @type array
   * @default []   
   */

  openProcesses: [],

  /**
   * Resolves the driver port
   *
   * @method getPort
   * @return {integer} port WebDriver server port
   */

  getPort: function () {
    return this.port;
  },

  /**
   * Returns the driver host
   *
   * @method getHost
   * @return {string} host WebDriver server hostname
   */

  getHost: function () {
    return this.host;
  },

  /**
   * Resolves the maximum range for the driver port
   *
   * @method getMaxPort
   * @return {integer} port Max WebDriver server port range
   */

  getMaxPort: function () {
    return this.maxPort;
  },

  /**
   * Launches the driver
   * (the driver takes care of launching the browser)
   *
   * @method launch
   * @return {object} promise Browser promise
   */

  launch: function (configuration, events, config) {
    var deferred = Q.defer();

    // store injected configuration/log event handlers
    this.reporterEvents = events;
    this.configuration = configuration;
    this.config = config;

    // check for a user set port
    var browsers = this.config.get('browsers');
    if (browsers && Array.isArray(browsers)) {
      browsers.forEach(this._checkUserDefinedPorts.bind(this));
    }

    // check if the current port is in use, if so, scan for free ports
    portscanner.findAPortNotInUse(this.getPort(), this.getMaxPort(), this.getHost(), this._checkPorts.bind(this, deferred));
    return deferred.promise;
  },

  /**
   * Kills the driver & browser processes
   *
   * @method kill
   * @chainable
   */

  kill: function () {
    // get a list of all running processes
    this._list(function(svc){
      // filter out the browser process
      svc.forEach(function (item, idx) {
        Object.keys(item).forEach(function (key) {
          if(svc[idx][key] === 'iexplore.exe') {
            // kill the browser process
            this._kill(svc[idx].PID, true);
          }
        }.bind(this));
      }.bind(this));
    }.bind(this),true);

    // kill the driver process
    this.spawned.kill('SIGTERM');
    return this;
  },

  _checkPorts: function (deferred, err, port) {
    // check if the port was blocked & if we need to switch to another port
    if (this.port !== port) {
      this.reporterEvents.emit('report:log:system', 'dalek-browser-ie: Switching to port: ' + port);
      this.port = port;
    }

    // invoke the ie driver afterwards
    this._startIEdriver(deferred);
    return this;
  },

  _startIEdriver: function (deferred) {
    var stream = '';
    this.spawned = cp.spawn(iedriver.path, ['--port=' + this.getPort()]);

    this.spawned.stdout.on('data', function (data) {
      var dataStr = data + '';
      stream += dataStr;
      if (stream.search('Listening on port') !== -1) {
        deferred.resolve();
      }
    });
    return this;
  },

  /**
   * Process user defined ports
   *
   * @method _checkUserDefinedPorts
   * @param {object} browser Browser configuration
   * @chainable
   * @private
   */

  _checkUserDefinedPorts: function (browser) {
    // check for a single defined port
    if (browser.ie && browser.ie.port) {
      this.port = parseInt(browser.ie.port, 10);
      this.maxPort = this.port + 90;
      this.reporterEvents.emit('report:log:system', 'dalek-browser-ie: Switching to user defined port: ' + this.port);
    }

    // check for a port range
    if (browser.ie && browser.ie.portRange && browser.ie.portRange.length === 2) {
      this.port = parseInt(browser.ie.portRange[0], 10);
      this.maxPort = parseInt(browser.ie.portRange[1], 10);
      this.reporterEvents.emit('report:log:system', 'dalek-browser-ie: Switching to user defined port(s): ' + this.port + ' -> ' + this.maxPort);
    }

    return this;
  },

  /**
   * Lists all running processes (win only)
   *
   * @method _list
   * @param {Function} callback Receives the process object as the only callback argument
   * @param {Boolean} [verbose=false] Verbose output
   * @chainable
   * @private
   */

  _list: function(callback, verbose) {
    verbose = typeof verbose === 'boolean' ? verbose : false;
    cp.exec('tasklist /FO CSV' + (verbose === true ? ' /V' : ''), function (err, stdout) {
      var pi = stdout.split('\r\n');
      var p = [];

      pi.forEach(function (line) {
        if (line.trim().length !== 0) {
          p.push(line);
        }
      });

      var proc = [];
      var head = null;
      while (p.length > 1) {
        var rec = p.shift();
        rec = rec.replace(/\"\,/gi,'";').replace(/\"|\'/gi,'').split(';');
        if (head === null){
          head = rec;
          for (var i=0;i<head.length;i++){
            head[i] = head[i].replace(/ /gi,'');
          }

          if (head.indexOf('PID')<0){
            head[1] = 'PID';
          }
        } else {
          var tmp = {};
          for (var j=0;j<rec.length;j++){
            tmp[head[j]] = rec[j].replace(/\"|\'/gi,'');
          }
          proc.push(tmp);
        }
      }
      callback(proc);
    });

    return this;
  },

  /**
   * Kill a specific process (win only)
   *
   * @method _kill
   * @param {Number} PID Process ID
   * @param {Boolean} [force=false] Force close the process.
   * @param {Function} [callback] Callback after process has been killed
   * @chainable
   * @private
   */

  _kill: function(pid, force, callback) {
    if (!pid || isNaN(parseInt(pid))){
      throw new Error('PID is required for the kill operation.');
    }
    callback = callback || function(){};
    if (typeof force === 'function'){
      callback = force;
      force = false;
    }
    cp.exec('taskkill /PID ' + pid + (force === true ? ' /f' : ''),callback);
    return this;
  }

};

// expose the module
module.exports = InternetExplorer;
