var Q = require('q');
var spawn = require('child_process').spawn;
var iedriver = require('./lib/iedriver');
var nwin = require('node-windows');

module.exports = {
    port: 5555,
    host: 'localhost',
    path: '/',
    spawned: null,
    launch: function () {
        var deferred = Q.defer();
        var stream = '';
        this.spawned = spawn(iedriver.path, ['--port=5555']);

        this.spawned.stdout.on('data', function (data) {
            var dataStr = new String(data);
            stream += dataStr;
            if (stream.search('Listening on port') !== -1) {
                deferred.resolve();
            }
        });
        return deferred.promise;
    },
    kill: function () {

        nwin.list(function(svc){
          svc.forEach(function (item, idx) {
            Object.keys(item).forEach(function (key) {
               if(svc[idx][key] === 'iexplore.exe') {
                   nwin.kill(svc[idx].PID); 
               }
            });
          });
        },true);
        this.spawned.kill('SIGTERM');
    }
};
