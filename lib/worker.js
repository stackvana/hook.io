process.setMaxListeners(99);
/* worker agent for running hooks */
var http = require('resource-http');
var debug = require('debug')('big::worker');
var hook = require('./resources/hook');
var user = require('./resources/user');
var fs = require('fs');
var config = require('../config');
var chroot = require('chroot');

user.persist(config.couch);
hook.persist(config.couch);

var worker = {};
module['exports'] = worker;

// sometimes in development you might mix and match a common ssl for projects
// comment this line out for production usage
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

worker.start = function (opts, cb) {

  // sometimes in development you might mix and match a common ssl for projects
  // comment this line out for production usage
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

  var sslKeyDirectory = config.sslKeyDirectory;
  var key = fs.readFileSync(sslKeyDirectory + "server.key").toString();
  var cert = fs.readFileSync(sslKeyDirectory + "server.crt").toString();
  var ca = [fs.readFileSync(sslKeyDirectory + 'gd1.crt').toString(), fs.readFileSync(sslKeyDirectory + 'gd2.crt').toString(), fs.readFileSync(sslKeyDirectory + 'gd3.crt').toString()]


  // worker is very simple. everything is streaming http.
  // http-resource will auto-increment the port if 10000 is not available
  // this gives the ability to run this script multiple times to spawn multiple servers
  http.listen({ 
    port: 10000,
    https: config.site.https,
    cert: cert,
    key: key,
    ca: ca,
    sslRequired: true,
    onlySSL: true
  }, function (err, app) {

    if (config.useChroot === true) {
      try {
        chroot('/Users/chroot', 'worker');
        console.log('changed root to "/Users/chroot" and user to "worker"');
      } catch(err) {
        console.error('changing root or user failed', err);
        process.exit(1);
      }
    }

    app.get('/:owner/:hook', hook.run);
    app.post('/:owner/:hook', hook.run)
    app.get('/:owner/:hook/*', hook.run);
    app.post('/:owner/:hook/*', hook.run)
    return cb(err, app);
  })
};