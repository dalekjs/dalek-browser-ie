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

// ext. libs
var Q = require('q');
var spawn = require('child_process').spawn;
var nwin = require('node-windows');

// int. libs
var iedriver = require('./lib/iedriver');

/**
 * @module
 */

module.exports = {

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
     * @return integer
     */

    getPort: function () {
        return this.port;
    },

    /**
     * Returns the driver host
     *
     * @method getHost
     * @type string
     */

    getHost: function () {
        return this.host;
    },

    /**
     * Launches the driver
     * (the driver takes care of launching the browser)
     *
     * @method launch
     * @return Q.promise
     */

    launch: function (options) {
        var deferred = Q.defer();
        var stream = '';
        this.spawned = spawn(iedriver.path, ['--port=' + this.getPort(), '--host=' + this.getHost()]);

        this.spawned.stdout.on('data', function (data) {
            var dataStr = new String(data);
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
        nwin.list(function(svc){
          // filter out the browser process
          svc.forEach(function (item, idx) {
            Object.keys(item).forEach(function (key) {
              if(svc[idx][key] === 'iexplore.exe') {
                // kill the browser process
                nwin.kill(svc[idx].PID);
              }
            });
          });
        },true);

        // kill the driver process
        this.spawned.kill('SIGTERM');
        return this;
    }
};
