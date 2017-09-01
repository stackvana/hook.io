var lb = require('../../../lib/load-balancer'),
    web = require('../../../lib/web'),
    worker = require('../../../lib/worker');

module.exports = function start (opts, cb) {
  var servers = [];
  lb.start({}, function(err, app){
    if (err) {
      throw err;
    }
    servers.push(app);
    console.log('lb started', app.server.address())

    web.start({}, function(err, app){
      if (err) {
        throw err;
      }
      servers.push(app);
      console.log('web server started', app.server.address())
    });

    worker.start({}, function (err, app) {
      if (err) {
        console.log('worker error'.red);
        throw err;
      }
      servers.push(app);
      console.log('worker started'.blue + ' ' + app.server._connectionKey.grey);
    });
    cb(null, servers);
  });
};