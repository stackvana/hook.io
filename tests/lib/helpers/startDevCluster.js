var lb = require('../../../lib/load-balancer/load-balancer'),
    web = require('../../../lib/web/web'),
    worker = require('../../../lib/worker/worker');

var config = require('../../../config');

module.exports = function start (opts, cb) {
  if (Object.keys(opts) === 0) {
    opts = config;
  }
  var servers = {};
  lb.start(opts, function(err, app){
    if (err) {
      throw err;
    }
    servers['lb'] = app;
    console.log('lb started'.blue, app.server.address())
    web.start(opts, function(err, app){
      if (err) {
        throw err;
      }
      servers['web'] = app;
      console.log('web server started'.blue, app.server.address())
      worker.start(opts, function (err, app) {
        if (err) {
          console.log('worker error'.red);
          throw err;
        }
        servers['worker'] = app;
        console.log('worker started'.blue + ' ' + app.server._connectionKey.grey);
        cb(null, servers);
      });
    });
  });
};