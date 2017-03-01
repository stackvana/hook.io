process.setMaxListeners(99);
/* worker agent for running hooks */

var config = require('../config');

if (process.platform === "darwin") {
  config.sslKeyDirectory = __dirname + '/../ssl/';
  config.chrootDirectory = '/Users/worker';
  config.redis.host = "0.0.0.0";
  config.couch.host = "0.0.0.0";
  config.site.host = "0.0.0.0";
  //config.locales.directory 
}

var secrets = {};

var http = require('resource-http');
var debug = require('debug')('big::worker');
var hook = require('./resources/hook');
var user = require('./resources/user');
var keys = require('./resources/keys');
keys.setUser(user);
var fs = require('fs');
var chroot = require('chroot');
var i18n = require('i18n-2')
var events = require('./resources/events');
var cache = require('./resources/cache');

/*
var oysClient = require('oys/client');
var client = oysClient.createClient({
  oys_private_key: config.oys_private_key,
  host: 'localhost',
  port: 4000,
  protocol: "http"
});
*/

var worker = {};
module['exports'] = worker;
var posix = require('posix');
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

  var defaultConfig = {
    port: config.worker.startingPort,
    // https: config.site.https,
    noSession: true,
    cert: cert,
    host: config.site.host,
    key: key,
    ca: ca,
    nodeinfo: true
    //sslRequired: false,
    //onlySSL: false
  };

  startServer();

  /*
  // get remote configuration for server from oys
  client.secret.get(['dev-worker'], function (err, _secrets) {
    if (err) {
      console.log('worker: remote secrets were not fetched, using default static configuration.');
      // secrets = config;
    } else {
      secrets = _secrets;
      // TODO: update API so that it is uniform no matter how many secrets are returned,
      // this means we will *always* return secrets wrapped with a name property
      secretConfig = secrets;
      // websPool = secrets['dev-pool-webs'];
      console.log('got remote secrets', secretConfig);
      // merge secretConfig over default config
      for (var p in secretConfig) {
        defaultConfig[p] = secretConfig[p];
      }
      defaultConfig.secrets = secretConfig;
    }
    startServer();
  });
  */

  function startServer () {
    http.listen(defaultConfig, function (err, app) {
      // Remark: this app is using an in-memory session store
      // That's not ideal, as it will leak over time, but we actually don't need sessions at all for the worker?
      // TODO: Look into removing session middleware completely from worker instances

      user.persist(config.couch);
      hook.persist(config.couch);
      keys.persist(config.couch);

      if (config.useChroot === true) {
        try {
          chroot(config.chrootDirectory, config.chrootUser, 1000);
          posix.setrlimit('nproc', {
            soft: config.worker.nproc.soft,
            hard: config.worker.nproc.hard
          });
          console.log('changed root to "/Users/chroot" and user to "worker"');
        } catch(err) {
          console.error('changing root or user failed', err);
          process.exit(1);
        }
      }

      // why is 18-n required in the worker?
      app.use(function (req, res, next) {
        var opt = {
          request: req,
          locales: config.locales.locales,
          directory: require.resolve('hook.io-i18n').replace('index.js', '/locales')
        };
        opt.request = req;
        req.i18n = new i18n(opt);
        // Express 3
        if (res.locals) {
          i18n.registerMethods(res.locals, req)
        }

        // hack for proper user session from load-balancer for hook.io
        // we could do a proper express session lookup instead
        //console.log('performing header check' ,req.headers)
        if (typeof req.headers["x-hookio-user-session-name"] !== "undefined") {
          // Note: Since this header value is explicity set by the hook.io front-end server *after* the client request is processed ( based on existing auth logic )...
          // there should be no issue here with users' being able to overwrite x-hookio-user-session-name maliciously
          // TODO: no more sessions?, or issue with new gateway code?
          //req.session.user = req.headers["x-hookio-user-session-name"];
        }

        next();
      });

      app.get('/', function serveInfo (req, res){
        res.json({ status: "online" });
      });

      app.post('/', function serveInfo (req, res){
        res.json({ status: "online" });
      });

      app.get('/gateway', hook.gateway);
      app.post('/gateway', hook.gateway)

      app.get('/:owner/:hook', function(req, res, next){
        hook.run(req, res, function(){
          // If we made it to the end of the middleware-chain, assume it's time to stop the service
          // If we don't the request will hang forever
          // Note: Most languages don't have explict res.end() function support ( like JavaScript )
          res.end();
        })
      });

      app.post('/:owner/:hook', function(req, res, next){
        hook.run(req, res, function(){
          // If we made it to the end of the middleware-chain, assume it's time to stop the service
          // If we don't the request will hang forever
          // Note: Most languages don't have explict res.end() function support ( like JavaScript )
          res.end();
        })
      });

      app.get('/:owner/:hook/*', function(req, res, next){
        hook.run(req, res, function(){
          // If we made it to the end of the middleware-chain, assume it's time to stop the service
          // If we don't the request will hang forever
          // Note: Most languages don't have explict res.end() function support ( like JavaScript )
          res.end();
        })
      });

      app.post('/:owner/:hook/*', function(req, res, next){
        hook.run(req, res, function(){
          // If we made it to the end of the middleware-chain, assume it's time to stop the service
          // If we don't the request will hang forever
          // Note: Most languages don't have explict res.end() function support ( like JavaScript )
          res.end();
        })
      });

      if (config.worker.registerWithLoadBalancer === true) {
        var address = app.server.address();
        var _node = {
          host: config.worker.publicIP || address.address, // might need to be hard-coded to ip of web pool
          port: address.port,
          pid: process.pid,
          spawned: new Date(),
          status: 'fresh'
        };
        console.log('registering with load balancer. adding to pools.worker', _node);
        // update pool with new server instance
        cache.sadd('pools.worker', _node, function (err, pools) {
          if (err) {
            return cb(err)
          }
          return cb(err, app);
        });
      } else {
        return cb(err, app);
      }

    });

  }

};