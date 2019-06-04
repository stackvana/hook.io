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
  config.worker.publicIP = "0.0.0.0";
  config.web.host = "0.0.0.0";
}

var request = require("hyperquest");
var rrequest = require('request');
var http = require('resource-http');
var domain = require('../resources/domain');
var cache = require('../resources/cache');
var alerts = require('../resources/alerts/alerts');

var colors = require('colors');
var fs = require('fs');
var pool = config.pools.worker;

var server = {};
module['exports'] = server;

var sslKeyDirectory = config.sslKeyDirectory;

server.start = function start (opts, cb) {

  var sslPath, key, cert, ca;
  if (process.platform === "darwin") {
    /* Removed, migrated to godaddy to letsencrypt */
    key = fs.readFileSync(sslKeyDirectory + "localhost.key").toString();
    cert = fs.readFileSync(sslKeyDirectory + "localhost.crt").toString();
    //ca = [fs.readFileSync(sslKeyDirectory + 'gd1.crt').toString(), fs.readFileSync(sslKeyDirectory + 'gd2.crt').toString(), fs.readFileSync(sslKeyDirectory + 'gd3.crt').toString()]
  } else {
    sslPath = '/etc/letsencrypt/live/hook.io/';
    key = fs.readFileSync(sslPath + "privkey.pem").toString();
    cert = fs.readFileSync(sslPath + "fullchain.pem").toString();
  }

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
      port: config.balancer.port,
      wss: true, // enables websocket server
      enableUploads: false,
      // host: config.balancer.host,
      roots: config.balancer.roots,
      passport: true,
      // port: config.balancer.port,
      https: config.balancer.https,
      cert: cert,
      key: key,
      // ca: ca,
      /*
      session: config.web.session,
      redis: config.balancer.redis,
      */
      cacheView: config.cacheView,
      customDomains: true,
      sslRequired: false // will not force ssl connections on custom domains / subdomains
  };

  startServer();
  /*
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
  */

  function startServer () {
    // TODO: Need to not start listening server in resource-http
    //       resource-http should return server and app instance to modify,
    //       after additional routes are added, then we can start listening.
    //       This is important due to cluster module thinking nodes are online and ready, but they are still adding new routes
    //       Until fixed, this could cause potential issue with zero-downtime updates of load balancer ( since nodes are coming online before additional routes are ready )
    http.listen(defaultConfig, function (err, app) {

      if (err) {
        // any errors starting the load-balancer should result in process crash / do not start server
        throw err;
      }

      server.app = app;
      big.server = server;
      if (app.wss) {
        app.wss.on('error', function errorHandler(err) {
          console.log('warning wss.error emitted', err.message)
        })

        app.wss.on('connection', function connection(ws) {
          var target = ws.upgradeReq.url;
          // console.log('incoming connection ->', target)
          ws.on('error', function errorHandler(error) {
            console.log('warning ws.error emitted', error.message)
            proxyWebsocketMessage(ws, target, message)
          });
          ws.on('message', function incoming(message) {
            // console.log('incoming data stream', message)
            proxyWebsocketMessage(ws, target, message)
          });
        });
      }

      if (app.secureWss) {
        app.secureWss.on('error', function errorHandler(err) {
          console.log('warning wss.error emitted', err.message)
        })

        app.secureWss.on('connection', function connection(ws) {
          var target = ws.upgradeReq.url;
          // console.log('incoming secure connection ->', target)
          ws.on('error', function errorHandler(error) {
            console.log('warning ws.error emitted', error.message)
            proxyWebsocketMessage(ws, target, message)
          });
          ws.on('message', function incoming(message) {
            // console.log('incoming secure data stream', message)
            proxyWebsocketMessage(ws, target, message)
          });
        });
      }

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
        var w = config.pools.worker.pop();
        config.pools.worker.unshift(w);
        var _url = 'http://' + w.host + ':' + w.port + target;
        // console.log(new Date().toString() + ' - about to use worker', _url);
        rrequest.post(_url, { json: message }, function (err, res, body) {
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
        '/account/billing/:section',
        '/blog/:article',
        '/files',
        '/files/:method',
//        '/api-gateway',
//        '/api-gateway/:method',
        '/keys/:method',
        '/cron/:method',
        '/cron/:owner/:name',
        '/cron/:owner/:name/:method',
        '/gateway/logs',
        '/packages/:provider',
        '/packages/:provider/:method',
        '/login/:provider',
        '/stripe/webhook',
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
        // '/:owner/:hook/refresh',
        '/metrics/:owner/:metric',
        '/metrics/:owner/:hook/:metric',
        '/components/:component',
        '/editor/:page',
        '/emails/:email',
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

      app.all('/:owner/:hook', function (req, res){
        req.params.owner = req.params.owner.toLowerCase();
        req.params.hook = req.params.hook.toLowerCase();
        hookHandler(req, res)
      });

      app.all('/:owner/:hook/*', function (req, res){
        req.params.owner = req.params.owner.toLowerCase();
        req.params.hook = req.params.hook.toLowerCase();
        hookHandler(req, res);
      });

      app.get('/_cluster', function (req, res) {
        if (typeof process.send !== 'function') {
          return res.json({ error: true, message: 'process.send function not detected. is cluster mode enabled?'})
        }
        if (req.resource.params.super_private_key === config.superadmin.super_private_key) {
          var clusterQuery = {};
          process.once('message', function(message) {
            clusterQuery = message;
               return res.json(message);
          });
          process.send({ event: 'query' });
        } else {
          res.end('invalid credentials');
        }
      });

      app.get('/_restart', function (req, res) {
        if (typeof process.send !== 'function') {
          return res.json({ error: true, message: 'process.send function not detected. is cluster mode enabled?'})
        }
        if (req.resource.params.super_private_key === config.superadmin.super_private_key) {
          process.send({ event: 'restart' })
          res.end('restart nodes');
        } else {
          res.end('invalid credentials');
        }
      });
      app.use(server.handle404);
      updateBalancingTable(function (err) {
        // setTimeout to update the balancing table every 20 seconds
        loopUpdates();
        cb(err, app);
      });
    });
  }

};

function loopUpdates () {
  setTimeout(function () {
    updateBalancingTable(function(err){
      if (err) {
        console.log('error updating balancing table', err)
      }
      loopUpdates();
    })
  }, 1000);
};

function updateBalancingTable (cb) {
  // get latest config from redis cache
  cache.smembers('pools.web', function (err, webs) {
    if (err) {
      console.log('cant fetch pools.web', err);
      return cb(err);
    }
    // console.log('got pools.web', webs.length);
    if (webs !== null && typeof webs === "object") {
      // if the pool is empty, simply assign the current webs
      if (config.pools.web.length === 0) {
        config.pools.web = webs;
      } else {
        // if the pool already contains web instances,
        // for every existing web node...
        config.pools.web.forEach(function(oldWeb, i){
          var found = false;
          // check to see if it exists in the incoming table
          webs.forEach(function(newWeb){
            if (newWeb && oldWeb && oldWeb.host === newWeb.host && oldWeb.port === newWeb.port) {
              // we found a matching web already in the load balancer pool
              found = true;
            } else {
            }
          });
          if (!found) {
            // if we didn't find a match, assume it's expired and remove it
            console.log('remove web node from pool', oldWeb);
            config.pools.web.splice(i, 1);
          }
        });
        // for every incoming web node
        webs.forEach(function(newWeb){
          var found = false;
          // check against all existing webs
          config.pools.web.forEach(function(oldWeb, i){
            // console.log(newWeb, oldWeb)
            if (newWeb && oldWeb && oldWeb.host === newWeb.host && oldWeb.port === newWeb.port) {
              // we found a matching web already in the load balancer pool
              found = true;
            }
          });
          if (!found) {
            // if we didn't find a match, assume it's a new web and put it in the end
            config.pools.web.unshift(newWeb);
          }
        });
      }
    }

    cache.smembers('pools.worker', function (err, workers) {
      if (err) {
        console.log('cant fetch pools.worker', err);
        return cb(err);
      }
      // console.log('got pools.worker', workers.length);
      if (workers !== null && typeof workers === "object") {
        var found = false;
        // only update workers if they are new, add them to the end of the list
        if (config.pools.worker.length === 0) {
          config.pools.worker = workers;
          return cb(null);
        }

        // for every existing worker node
        config.pools.worker.forEach(function(oldWorker, i){
          var found = false;
          // check to see if it exists in the incoming table
          workers.forEach(function(newWorker){
            if (newWorker && oldWorker && oldWorker.host === newWorker.host && oldWorker.port === newWorker.port) {
              // we found a matching web already in the load balancer pool
              found = true;
            }
          });
          if (!found) {
            // if we didn't find a match, assume it's expired and remove it
            console.log('remove worker node from pool', oldWorker);
            config.pools.worker.splice(i, 1);
            //config.pools.worker.splice(i, 0);
          }
        });

        // for every incoming worker
        workers.forEach(function(newWorker){
          var found = false;
          // check against all existing workers
          config.pools.worker.forEach(function(oldWorker){
            // console.log(newWorker, oldWorker)
            if (newWorker && oldWorker && oldWorker.host === newWorker.host && oldWorker.port === newWorker.port) {
              // we found a matching worker already in the load balancer pool
              found = true;
            }
          });
          if (!found) {
            // if we didn't find a match, assume it's a new worker and put it in the end
            config.pools.worker.unshift(newWorker);
          }
        });
      }
      cb(null);
    });
  });
}

server.handle404 = function handle404 (req, res) {
  // console.log('falling back to 404'.blue, req.url, req.host);
  // Remark: Available secrets should now automatically merge into config scope
  // var remoteHandler = require('run-remote-service')({ pool: secrets['dev-pool-webs'] });
  var remoteHandler = require('run-remote-service')({
    pool: config.pools.web,
    errorHandler: function (err, req, res) {
      var errStr = 'Error communicating with ' + req.url + '\n\n';
      errStr += 'The streaming connection errored in recieving data.\n\n';
      errStr += 'Please copy and paste this entire error message to: ' + config.app.adminEmail + '.\n\n';
      if (req.jsonResponse) {
        return res.json({
          error: true,
          message: errStr,
          result: {
            url: req.url,
            host: req.host,
            time: new Date()
          }
        });
      } else {
        res.write(errStr);
        res.end(err.stack)
      }
    }
  });
  remoteHandler(req, res, function(){
    // console.log('complete');
    // next callback is not needed as response should have ended
  });
};