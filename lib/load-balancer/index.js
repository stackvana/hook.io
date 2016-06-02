/*

  load-balancer/index.js

  front-facing webserver service for hook.io
  responsible for static assetts, views, and API endpoints

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
var hook = require('../resources/hook');
var metric = require('../resources/metric');
var modules = require('../resources/packages');
var cache = require('../resources/cache');
var user = require('../resources/user');
var billing = require('../resources/billing');
var domain = require('../resources/domain');
var keys = require('../resources/keys');
var events = require('../resources/events');
var mergeParams = require('../../view/mergeParams');
//var checkRoleAccess = require('./routeHandlers/checkRoleAccess');
keys.setUser(user);

var bodyParser = require('body-parser');
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

// var trycatch = require('trycatch');

var server = {};
module['exports'] = server;

var jsonParser = bodyParser.json();

var sslKeyDirectory = config.sslKeyDirectory;

server.start = function start (opts, cb) {

  var GitHubStrategy = require('passport-github').Strategy;

  var key = fs.readFileSync(sslKeyDirectory + "server.key").toString();
  var cert = fs.readFileSync(sslKeyDirectory + "server.crt").toString();
  var ca = [fs.readFileSync(sslKeyDirectory + 'gd1.crt').toString(), fs.readFileSync(sslKeyDirectory + 'gd2.crt').toString(), fs.readFileSync(sslKeyDirectory + 'gd3.crt').toString()]

  // sometimes in development you might mix and match a common ssl for projects
  // comment this line out for production usage
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

  var secretConfig;

  var defaultConfig = {
      "port": 9999,
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
      console.log('Warning: Could not get secrets, using default static configuration!');
    } else {
      // use discovered secrets as config
      secrets = _secrets;
      secretConfig = secrets['dev-load-balancer'];
      //websPool = secrets['dev-pool-webs'];
      console.log('got remote secrets', _secrets);
      // merge secretConfig over default config
      for (var p in secretConfig) {
        defaultConfig[p] = secretConfig[p];
      }
    }
    startServer();
  });

  function startServer () {
    http.listen(defaultConfig, function (err, app) {

      var GITHUB_CLIENT_ID = config.github.CLIENT_ID;
      var GITHUB_CLIENT_SECRET = config.github.CLIENT_SECRET;

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

      app.get('/metrics/hook/:metric', function (req, res){
        metric.get('/hook' + "/" + req.params.metric, function(err, result){
          /*
          res.writeHead(200, {
            "Content-Type": "text/plain"
          });
          */
          if (result === null || typeof result === "undefined") {
            result = "0";
          }
          res.end(result.toString());
        })
      });

      app.get('/metrics/:owner/:hook/:metric', function (req, res){
        req.params.owner = req.params.owner.toLowerCase();
        req.params.hook = req.params.hook.toLowerCase();
        metric.get('/' + req.params.owner + "/" + req.params.hook + "/" + req.params.metric, function(err, result){
          res.end(result);
        })
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
        console.log('mutate', req.url)
        oysMiddle(req, res, function(){
          console.log('fffff');
          res.end('fff');
        });
      });

      app.use(server.handle404);
      cb(null, app);
    });
  }

};

server.handle404 = function handle404 (req, res) {
  // proxy request to web server pool
  /*
  console.log('handling 404', req.url, req.method)
  console.log(secrets)
  var _url = 'http://' + secrets['dev-pool-webs'][0].host + ':' + secrets['dev-pool-webs'][1].port + req.url;
  console.log("fml", _url)
  var stream = rrequest({ url: _url, method: req.method });
  //var stream = request(_url);
  req.pipe(stream).pipe(res);
  //req.pipe(stream).pipe(res);
  stream.on('error', function(err){
    console.log('error', err)
  });

  //rrquest(req.url).pip
  return;
  */
  var remoteHandler = require('run-remote-service')({ pool: secrets['dev-pool-webs'] });

  remoteHandler(req, res, function(){
    console.log('complete');
  });
  /*
  server.app.view['404'].present({
    request: req,
    response: res
  }, function (err, html){
    res.writeHead(404);
    res.end(html);
  })
  */
};