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
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

// int. libs
var iedriver = require('./lib/iedriver');

/**
 * Native Webdriver base class
 *
 * @module DalekJS
 * @class InternetExplorer
 * @namespace Browser
 */

var InternetExplorer = {

  /**
   * Verbose version of the browser name
   *
   * @property
   * @type string
   * @default Internet Explorer
   */

  longName: 'Internet Explorer',

  /**
   * Default port of the IEDriverServer
   * The port may change, cause the port conflict resultion
   * tool might pick another one, if the default one is blocked
   *
   * @property
   * @type integer
   * @default 5555
   */

  port: 5555,

  /**
   * Default host of the IEDriverServer
   * The host may be overriden with
   * a user configured value
   *
   * @property
   * @type string
   * @default localhost
   */

  host: 'localhost',

  /**
   * Path to the IEDriverServer.exe file
   *
   * @property
   * @type string
   * @default /
   */

  path: '/',

  /**
   * Child process instance of the IEDriverServer
   *
   * @property
   * @type null|Object
   */

  spawned: null,

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
   * Launches the driver
   * (the driver takes care of launching the browser)
   *
   * @method launch
   * @return {object} promise Browser promise
   */

  launch: function () {
    var deferred = Q.defer();
    var stream = '';
    this.spawned = spawn(iedriver.path, ['--port=' + this.getPort()]);

    this.spawned.stdout.on('data', function (data) {
      var dataStr = data + '';
      stream += dataStr;
      if (stream.search('Listening on port') !== -1) {
        deferred.resolve();
      }
    });
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
            console.log(svc[idx]);
            this._kill(svc[idx].PID);
          }
        }.bind(this));
      }.bind(this));
    }.bind(this),true);

    // kill the driver process
    this.spawned.kill('SIGTERM');
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
    exec('tasklist /FO CSV' + (verbose === true ? ' /V' : ''), function (err, stdout) {
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
    if (!pid){
      throw new Error('PID is required for the kill operation.');
    }
    callback = callback || function(){};
    if (typeof force === 'function'){
      callback = force;
      force = false;
    }
    exec('taskkill /PID ' + pid + (force === true ? ' /f' : ''),callback);
    return this;
  }

};

// expose the module
module.exports = InternetExplorer;
