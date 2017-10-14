/*

  web/index.js

  front-facing webserver service for hook.io
  responsible for static assetts, views, and API endpoints

*/

var big = require('big');
// application has a lot of listeners
big.resource.setMaxListeners(999);
process.setMaxListeners(999);
big.mode = "Online";

var config = require('../../config');

if (process.platform === "darwin") {
  config.sslKeyDirectory = __dirname + '/../../ssl/';
  config.chrootDirectory = '/Users/chroot';
  config.redis.host = "0.0.0.0";
  config.couch.host = "0.0.0.0";
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

var updatePool = require('../helpers/updatePool');

//var mergeParams = require('../../view/mergeParams');
var checkRoleAccess = require('../server/routeHandlers/checkRoleAccess');
keys.setUser(user);

var i18n = require('i18n-2')
var bodyParser = require('body-parser');
var colors = require('colors');
var fs = require('fs');
var pool = config.pools.worker;

// var trycatch = require('trycatch');
var server = {};
module['exports'] = server;
var jsonParser = bodyParser.json();

var sslKeyDirectory = config.sslKeyDirectory;

/*
var oysClient = require('oys/client');

var client = oysClient.createClient({
  oys_private_key: config.oys_private_key,
  host: 'localhost',
  port: 4000,
  protocol: "http"
});
*/

server.start = function start (opts, cb) {

  var GitHubStrategy = require('passport-github').Strategy;

  var key = fs.readFileSync(sslKeyDirectory + "server.key").toString();
  var cert = fs.readFileSync(sslKeyDirectory + "server.crt").toString();
  var ca = [fs.readFileSync(sslKeyDirectory + 'gd1.crt').toString(), fs.readFileSync(sslKeyDirectory + 'gd2.crt').toString(), fs.readFileSync(sslKeyDirectory + 'gd3.crt').toString()]

  // sometimes in development you might mix and match a common ssl for projects
  // comment this line out for production usage
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
  initCouchDatabase(function(){

    keys.persist(config.couch);
    hook.persist(config.couch);
    user.persist(config.couch);
    billing.persist(config.couch);
    domain.persist(config.couch);

    var secretConfig;

    var defaultConfig = {
        enableUploads: false,
        port: config.web.port,
        host: config.web.host,
        nodeinfo: true,
        // host: config.balancer.host,
        //roots: config.balancer.roots,
        view: __dirname + "/../../view",
        passport: true,
        locales: {
          locales: ['en', 'de']
        },
        app: { // TODO: make able to white-label easily
          name: "hook.io",
          // host: "https://hook.io",
          url: "http://localhost:9999",
          //url: "https://hook.io",
          domain: "hook.io",
          logo: "http://localhost:9999/img/logo.png",
          logoInverse: "http://localhost:9999/img/logo-inverse.png",
          adminEmail: "hookmaster@hook.io"
          /*
            Client ID
            c030536e9ff50ac1ce37
            Client Secret
            f8976cebe01d8a784d62d7636c7a1d6932c38524
          */
        },
        // port: config.balancer.port,
        /*
        https: config.balancer.https,
        cert: cert,
        key: key,
        ca: ca,
        */
        session: config.web.session,
        redis: config.balancer.redis,
        cacheView: config.cacheView,
        sslRequired: false // will not force ssl connections on custom domains / subdomains
    };

    startServer();

    /*
    // get remote configuration for server from oys
    client.secret.get(['dev-web'], function (err, _secrets) {
      if (err) {
        secrets = config;
        console.log('web: remote secrets were not fetched, using default static configuration.');
      } else {
        secrets = _secrets;
        // TODO: update API so that it is uniform no matter how many secrets are returned,
        // this means we will *always* return secrets wrapped with a name property
        secretConfig = secrets;
        // websPool = secrets['dev-pool-webs'];
        console.log('web: found remote secrets', secretConfig);
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

        var GITHUB_CLIENT_ID = config.github.CLIENT_ID;
        var GITHUB_CLIENT_SECRET = config.github.CLIENT_SECRET;
        server.app = app;
        big.server = server;

        var vfs =  require('hook.io-vfs');
        var vfsMiddle = vfs.middle({
          config: config,
          prefix: "/files/api/v1/fs",
          checkRoleAccess: checkRoleAccess,
          parent: app.view,
          unauthorizedRoleAccess: config.messages.unauthorizedRoleAccess
        });
        app.use('/files', vfsMiddle);

        /* TODO: add api=gateway plugin
        var apiGateway =  require('hook.io-api-gateway');
        var gatewayMiddle = apiGateway.middle({
          config: config,
          prefix: "/api-gateway/api/v1",
          checkRoleAccess: checkRoleAccess,
          parent: app.view,
          unauthorizedRoleAccess: config.messages.unauthorizedRoleAccess
        });

        app.use('/api-gateway', gatewayMiddle);
        */
        
        /*
        app.use('/files', function(req, res){
          console.log(vfsMiddle.toString())
          vfsMiddle(req, res, function(){
            res.end('files 404')
          });
        });
        */

        // TODO: move passport / login callback routes to separate file
        var passport = require('passport');

        passport.use(new GitHubStrategy({
            clientID: GITHUB_CLIENT_ID,
            clientSecret: GITHUB_CLIENT_SECRET,
            callbackURL: config.github.OAUTH_CALLBACK,
            passReqToCallback: true
          },
          function(req, accessToken, refreshToken, profile, done) {
            process.nextTick(function () {
              req.githubAccessToken = accessToken;
              profile.accessToken = accessToken;
              return done(null, profile);
            });
          }
        ));

        app.get('/login/github', passport.authenticate('github', {
          /*
            Remark: gist scope has been removed by default
                    now use /login/github/gist route for gist role access
          */
        }),
        function(req, res){
            // The request will be redirected to GitHub for authentication, so this
            // function will not be called.
        });

        app.get('/login/github/gist', passport.authenticate('github', {
            scope: ["gist"]
        }), function(req, res){
            // The request will be redirected to GitHub for authentication, so this
            // function will not be called.
        });

        app.get('/login/github/private-repos', passport.authenticate('github', {
            scope: ["repo"]
        }), function (req, res) {
            // The request will be redirected to GitHub for authentication, so this
            // function will not be called.
        });

        var loginCallbackHandler = require('../server/routeHandlers/loginCallback');
        app.get('/login/github/callback',
          passport.authenticate('github', { failureRedirect: '/failed' }),
          function (req, res) {
            loginCallbackHandler(req, res);
          });

        app.get('/logout', function(req, res){
          req.session.user = "anonymous";
          req.session.destroy();
          req.logout();
          res.redirect("/");
        });

        app.use(function (req, res, next) {

          /*
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
          */

          // hack for proper user session from load-balancer for hook.io
          // we could do a proper express session lookup instead
          //console.log('performing header check' ,req.headers)
          if (typeof req.headers["x-hookio-user-session-name"] !== "undefined") {
            // Note: Since this header value is explicity set by the hook.io front-end server *after* the client request is processed ( based on existing auth logic )...
            // there should be no issue here with users' being able to overwrite x-hookio-user-session-name maliciously
            req.session.user = req.headers["x-hookio-user-session-name"];
          }

          next();
        });

        var handleUser = require('../server/routeHandlers/user');

        app.get('/:owner', function (req, res) {
          req.params.owner = req.params.owner.toLowerCase();
          handleUser(req, res, app);
        });

        app.post('/:owner', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          handleUser(req, res, app);
        });

        var handleDelete = require('../server/routeHandlers/hookDelete');
        var handleResource = require('../server/routeHandlers/hookResource');
        var handlePackage = require('../server/routeHandlers/hookPackage');
        var handleSource = require('../server/routeHandlers/hookSource');

        var handleView = require('../server/routeHandlers/hookView');
        var handlePresenter = require('../server/routeHandlers/hookPresenter');
        var handleLogs = require('../server/routeHandlers/hookLogs');

        var handleEvents = require('../server/routeHandlers/hookEvents');
        // var handleModules = require('../server/routeHandlers/modules');
        var handleRefresh = require('../server/routeHandlers/refresh');

        app.get('/:owner/:hook/refresh', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          return handleRefresh(req, res);
        });

        app.post('/:owner/:hook/refresh', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          return handleRefresh(req, res);
        });

        app.get('/:owner/:hook/delete', function (req, res) {
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          return handleDelete(req, res);
        });

        app.post('/:owner/:hook/delete', function (req, res) {
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          return handleDelete(req, res);
        });

        app.get('/:owner/:hook/resource', function (req, res) {
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          return handleResource(req, res);
        });

        app.post('/:owner/:hook/resource', function (req, res) {
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          return handleResource(req, res);
        });

        app.get('/:owner/:hook/package', function (req, res) {
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          return handlePackage(req, res);
        });

        app.post('/:owner/:hook/package', function (req, res) {
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          return handlePackage(req, res);
        });

        app.get('/:owner/:hook/fork', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          return hook.fork(req, res);
        });

        app.post('/:owner/:hook/fork', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          return hook.fork(req, res);
        });

        app.get('/:owner/:hook/_fork', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          return hook.fork(req, res);
        });

        app.post('/:owner/:hook/_fork', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          return hook.fork(req, res);
        });

        app.post('/:owner/:hook/admin', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          return res.redirect(config.app.url + '/admin?owner=' + req.params.owner + '&name=' + req.params.hook + '');
        });

        app.get('/:owner/:hook/admin', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          return res.redirect(config.app.url + '/admin?owner=' + req.params.owner + '&name=' + req.params.hook + '');
        });

        app.post('/:owner/:hook/_admin', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          return res.redirect(config.app.url + '/admin?owner=' + req.params.owner + '&name=' + req.params.hook + '');
        });

        app.get('/:owner/:hook/_admin', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          return res.redirect(config.app.url + '/admin?owner=' + req.params.owner + '&name=' + req.params.hook + '');
        });


        /* TODO: enable stand-alone editor per service
        app.get('/:owner/:hook/editor', function (req, res){
          app.view.editor.index.present({ request: req, response: res }, function(err, html){
            console.log(err)
            res.end(html);
          });
        });
        */

        app.get('/:owner/:hook/_rev', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          app.view.hook._rev.present({ req: req, res: res }, function(err, html){
            res.end(html);
          });
        });

        app.get('/:owner/:hook/_rev/:revision', function (req, res) {
          var nanoConfig = 'http://' + config.couch.username + ":" + config.couch.password + "@" + config.couch.host + ":" + config.couch.port;
          var nano = require('nano')(nanoConfig);
          // TODO: run hook based on revision
          // Note: possible issue with running from cache?
          hook.findOne({ name: req.params.hook, owner: req.params.owner }, function(err, _u) {
            if (err) {
              return res.end(err.message);
            }
            nano.request({ db: 'hook',
                doc: _u.id,
                method: 'get',
                qs: { rev: req.params.revision }
              }, function(err, rev){
                if (err) {
                  return res.end(err.message);
                }
                res.json(rev);
              });
            });
        });

        app.get('/:owner/:hook/logs', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          handleLogs(req, res);
        });

        app.post('/:owner/:hook/logs', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          handleLogs(req, res);
        });

        app.get('/:owner/events', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          //req.params.hook = req.params.hook.toLowerCase();
          handleEvents(req, res);
        });

        app.post('/:owner/events', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          //req.params.hook = req.params.hook.toLowerCase();
          handleEvents(req, res);
        });

        app.all('/:owner/:hook/_src', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          app.view.hook._src.present({ req: req, res: res }, function (err, html) {
            res.end(html);
          });
        });

        // legacy /source property
        app.get('/:owner/:hook/source', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          handleSource(req, res);
        });

        app.post('/:owner/:hook/source', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          handleSource(req, res);
        });

        app.get('/:owner/:hook/view', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          handleView(req, res);
        });

        app.post('/:owner/:hook/view', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          handleView(req, res);
        });

        app.get('/:owner/:hook/presenter', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          handlePresenter(req, res);
        });

        app.post('/:owner/:hook/presenter', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          handlePresenter(req, res);
        });

        app.get('/metrics/hook/:metric', function (req, res){
          metric.zscore(req.params.metric, 'tallies', function (err, result) {
          // metric.get('/hook' + "/" + req.params.metric, function(err, result){
            if (result === null || typeof result === "undefined") {
              result = "0";
            }
            res.end(result.toString());
          })
        });

        app.get('/metrics/:owner/:metric', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.metric = req.params.metric.toLowerCase();
          metric.zscore(req.params.metric, req.params.owner, function(err, score){
            if (err) {
              return res.end(err.message);
            }
            res.end(score);
          });
        });

        app.get('/metrics/:owner/:hook/:metric', function (req, res){
          req.params.owner = req.params.owner.toLowerCase();
          req.params.hook = req.params.hook.toLowerCase();
          metric.zscore(req.params.metric, req.params.owner + "/" + req.params.hook , function(err, score){
            if (err) {
              return res.end(err.message);
            }
            res.end(score);
          });
        });

        app.use(server.handle404);

        if (config.web.registerWithLoadBalancer === true) {
          // app started, register it in config pool
          var address = app.server.address();
          var _node = {
            host: address.address, // might need to be hard-coded to ip of web pool
            port: address.port,
            status: 'fresh',
            spawned: new Date(),
            pid: process.pid
          };

          // check and remove any duplicate entries
          // currently taking in entire set into memory, but should be okay since set contains < 100 members ( close to 10 )
          // TODO: move into node resource
          cache.smembers('pools.web', function (err, members) {
            if (err) {
              return cb(err)
            }
            var found = null;
            members.forEach(function(member){
              if (member.host === _node.host && member.port === _node.port) {
                found = member;
              }
            });
            if (found === null) {
              addNode();
            } else {
             // remove the node then add it
              cache.srem('pools.web', found, function (err, rem) {
                if (err) {
                  console.log(err);
                }
                addNode();
              });
            }
          });

          function addNode () {
            console.log('registering with load balancer. adding to pools.web', _node);
            // update pool with new server instance
            cache.sadd('pools.web', _node, function (err, pools) {
              if (err) {
                return cb(err)
              }
              updateBalancingTable(function (err) {
                // setTimeout to update the balancing table every 20 seconds
                loopUpdates();
                cb(err, app);
              });
            });
          }
        } else {
          cb(err, app);
        }

      });
    }

  });

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
  cache.smembers('pools.worker', function (err, workers) {
     if (err) {
       console.log('cant fetch pools.worker', err);
       return cb(err);
     }
     // console.log('got pools.worker', workers.length);
     if (workers !== null && typeof workers === "object") {
       // only update workers if they are new, add them to the end of the list
       if (config.pools.worker.length === 0) {
         config.pools.worker = workers;
         return cb(null);
       }

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
           console.log('performing worker splice', i)
           config.pools.worker.splice(i, 1);
           //config.pools.worker.splice(i, 0);
         }
       });
       // for every incoming worker
       workers.forEach(function(newWorker){
         var found = false;
         // check against all existing workers
         config.pools.worker.forEach(function(oldWorker){
           //console.log(newWorker, oldWorker)
           if (oldWorker && newWorker && oldWorker.host === newWorker.host && oldWorker.port === newWorker.port) {
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
}

server.handle404 = function handle404 (req, res) {
  server.app.view['404'].present({
    request: req,
    response: res,
    req: req,
    res: res
  }, function (err, html){
    res.writeHead(404);
    res.end(html);
  });
};

// TODO: this should be part of the resource library
// see: https://github.com/bigcompany/resource/issues/33
function initCouchDatabase (cb) {
  var nano = require('nano')('http://' + config.couch.username + ":" + config.couch.password + "@" + config.couch.host + ':' + config.couch.port);
  //var db = nano.use(config.couch.database);
  nano.db.create(config.couch.database, function (err) {
    if (err && err.error) {
      if (err.error === "file_exists") {
        // CouchDB already exists, do nothing
      } else {
        console.log('Error: Could not create couchdb', err);
      }
    } else {
      // do nothing
    }
    cb(null);
  });
}