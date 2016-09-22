/*

  load-balancer/index.js

  front-facing load-balancer service for hook.io
  responsible for routing requests to either `web` or `worker` instances
  handles no direct logic for response processing, only routing

*/

var big = require('big');
// application has a lot of listeners
big.resource.setMaxListeners(999);
process.setMaxListeners(999);
big.mode = "Online";

var secrets = {};
var config = require('../../config');
var websPool = {};

if (process.platform === "darwin") {
  config.sslKeyDirectory = __dirname + '/../../ssl/';
  config.chrootDirectory = '/Users/chroot';
  config.redis.host = "0.0.0.0";
  config.couch.host = "0.0.0.0";
  config.workers = [
   { host: "0.0.0.0", port: "10000" },
   { host: "0.0.0.0", port: "10001" },
   { host: "0.0.0.0", port: "10002" },
   { host: "0.0.0.0", port: "10003" },
   { host: "0.0.0.0", port: "10004" }
  ];
}

var request = require("hyperquest");
var rrequest = require('request');
var http = require('resource-http');
var domain = require('../resources/domain');

var colors = require('colors');
var fs = require('fs');
var pool = config.workers;

// ocean yet secrets remote secret server
var oys = require('oys');

var client = oys.createClient({
  oys_private_key: config.oys_private_key,
  host: 'localhost',
  port: 4000,
  protocol: "http"
});

var server = {};
module['exports'] = server;

var sslKeyDirectory = config.sslKeyDirectory;

server.start = function start (opts, cb) {

  var key = fs.readFileSync(sslKeyDirectory + "server.key").toString();
  var cert = fs.readFileSync(sslKeyDirectory + "server.crt").toString();
  var ca = [fs.readFileSync(sslKeyDirectory + 'gd1.crt').toString(), fs.readFileSync(sslKeyDirectory + 'gd2.crt').toString(), fs.readFileSync(sslKeyDirectory + 'gd3.crt').toString()]

  // sometimes in development you might mix and match a common ssl for projects
  // comment this line out for production usage
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

  domain.persist(config.couch);

  var secretConfig;

  var defaultConfig = {
      "port": 9999,
      "proxyPort": 9999,
      "host": "0.0.0.0",
      "https": true,
      "roots": [
        "hookio",
        "0.0.0.0",
        "localhost",
        "hook.io",
        "www.hook.io"
      ],
      noSession: true,
      wss: true, // enables websocket server
      enableUploads: false,
      // host: config.balancer.host,
      roots: config.balancer.roots,
      passport: true,
      // port: config.balancer.port,
      https: config.balancer.https,
      cert: cert,
      key: key,
      ca: ca,
      /*
      session: config.web.session,
      redis: config.balancer.redis,
      */
      cacheView: config.cacheView,
      customDomains: true,
      sslRequired: false // will not force ssl connections on custom domains / subdomains
  };

  // get remote configuration for server from oys
  client.secret.get(['dev-load-balancer', 'dev-pool-webs'], function (err, _secrets) {
    if (err) {
      console.log('balancer: Remote secrets were not fetched, using default static configuration.');
      secrets = config;
    } else {
      // use discovered secrets as config
      secrets = _secrets;
      secretConfig = secrets['dev-load-balancer'];
      //websPool = secrets['dev-pool-webs'];
      // merge secretConfig over default config
      for (var p in secretConfig) {
        defaultConfig[p] = secretConfig[p];
      }
    }
    startServer();
  });

  function startServer () {
    http.listen(defaultConfig, function (err, app) {

      if (err) {
        // any errors starting the load-balancer should result in process crash / do not start server
        throw err;
      }

      server.app = app;
      big.server = server;

      app.wss.on('error', function errorHandler(err) {
        console.log('warning wss.error emitted', err.message)
      })

      app.wss.on('connection', function connection(ws) {
        var target = ws.upgradeReq.url;
        console.log('incoming connection ->', target)
        ws.on('error', function errorHandler(error) {
          console.log('warning ws.error emitted', error.message)
          proxyWebsocketMessage(ws, target, message)
        });
        ws.on('message', function incoming(message) {
          console.log('incoming data stream', message)
          proxyWebsocketMessage(ws, target, message)
        });
      });

      var request = require('request');

      function proxyWebsocketMessage (ws, target, message) {
        try {
          // attempt to parse message as JSON
          message = JSON.parse(message);
        } catch (err) {
          // if the JSON parse fails, create new object and store string as `body` property
          // note: this is somewhat hacky, but it does provide a functional api...feedback would be appreciated
          message = { body: message };
        }
        var w = pool.pop();
        pool.unshift(w);
        var _url = 'http://' + w.host + ':' + w.port + target;
        // console.log(new Date().toString() + ' - about to use worker', _url);
        rrequest.post(_url, { json: message }, function(err, res, body) {
          if (err) {
            try {
              ws.send(JSON.stringify({ "status": "error", "message": err.message }, true, 2));
            } catch (err) {
              console.log('warning ws.send failed', err.message)
            }
          } else {
            try {
              ws.send(JSON.stringify(body, true, 2));
            } catch (err) {
              console.log('warning ws.send failed', err.message)
            }
          }
        });
      };

      // Note: Due to the structure of the application, certain API / Web routes need to be registered here ( in the load-balancer ) to short-circuit the processing of the request
      //       If these routes are not registered, the requests will be passed to the worker pool as a microservice request ( with extra url paramters )
      //       These special routes are reserved words used for helping manage certain properties / methods on the service by using a reserved url path
      //       Without this lookup table, we'd have to take a performance hit somewhere to redirect ( such as redirecting inside worker).
      //       This look-up table will minimize request processing time
      var webRoutes = [
        '/account/:section',
        '/files/:method',
        '/keys/:method',
        '/login/:provider',
        '/login/:provider/:callback',
        '/datastore/:method',
        '/:owner/:hook/admin',
        '/:owner/:hook/_admin',
        '/:owner/:hook/fork',
        '/:owner/:hook/_fork',
        '/:owner/events',
        '/:owner/:hook/_rev',
        '/:owner/:hook/_rev/:revision',
        '/:owner/:hook/_src',
        '/:owner/:hook/source',
        '/:owner/:hook/view',
        '/:owner/:hook/presenter',
        '/:owner/:hook/_presenter',
        '/:owner/:hook/logs',
        '/:owner/:hook/package',
        '/:owner/:hook/resource',
        '/:owner/:hook/delete',
        '/:owner/:hook/refresh',
        '/metrics/:owner/:metric',
        '/metrics/:owner/:hook/:metric'
      ];

      webRoutes.forEach(function (r) {
        app.all(r, server.handle404);
      });

      var hookHandler = require('../server/routeHandlers/hook');

      function hookHandler (req, res) {
        req.params.owner = req.params.owner.toLowerCase();
        req.params.hook = req.params.hook.toLowerCase();
        hookHandler(req, res);
      };

      app.get('/:owner/:hook', function (req, res){
        req.params.owner = req.params.owner.toLowerCase();
        req.params.hook = req.params.hook.toLowerCase();
        hookHandler(req, res)
      });

      app.post('/:owner/:hook', function (req, res){
        req.params.owner = req.params.owner.toLowerCase();
        req.params.hook = req.params.hook.toLowerCase();
        hookHandler(req, res);
      });

      app.get('/:owner/:hook/*', function (req, res){
        req.params.owner = req.params.owner.toLowerCase();
        req.params.hook = req.params.hook.toLowerCase();
        hookHandler(req, res);
      });

      app.post('/:owner/:hook/*', function (req, res){
        req.params.owner = req.params.owner.toLowerCase();
        req.params.hook = req.params.hook.toLowerCase();
        hookHandler(req, res);
      });

      var oysMiddle = oys.middle({
        secrets: secrets,
        //prefix: "/files/api/v1/fs",
        //checkRoleAccess: checkRoleAccess,
        //parent: app.view,
        //unauthorizedRoleAccess: config.messages.unauthorizedRoleAccess
      });

      app.use('/_oys', function(req, res, next){
        oysMiddle(req, res, function(){
          // console.log('oysMiddle callback');
          // next callback is not needed as response should have ended
        });
      });

      app.use(server.handle404);
      cb(null, app);
    });
  }

};

server.handle404 = function handle404 (req, res) {

  // console.log('falling back to 404');
  // Remark: Available secrets should now automatically merge into config scope
  // var remoteHandler = require('run-remote-service')({ pool: secrets['dev-pool-webs'] });
  var remoteHandler = require('run-remote-service')({ pool: config.webPool });
  remoteHandler(req, res, function(){
    // console.log('complete');
    // next callback is not needed as response should have ended
  });
};