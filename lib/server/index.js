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
var bodyParser = require('body-parser');
var colors = require('colors');
var fs = require('fs');
var pool = config.workers;

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

  initCouchDatabase(function(){

    keys.persist(config.couch);
    hook.persist(config.couch);
    user.persist(config.couch);
    billing.persist(config.couch);
    domain.persist(config.couch);

    http.listen({
        wss: true, // enables websocket server
        enableUploads: false,
        host: config.site.host,
        root: __dirname + '/../../public',
        roots: config.site.roots,
        view: __dirname + '/../../view',
        passport: true,
        port: config.site.port,
        https: config.site.https,
        cert: cert,
        key: key,
        ca: ca,
        locales: {
          locales: config.locales.locales,
          directory: require.resolve('hook.io-i18n').replace('index.js', '/locales')
        },
        cacheView: config.cacheView,
        customDomains: true,
        sslRequired: false // will not force ssl connections on custom domains / subdomains
    }, function (err, app) {

      var GITHUB_CLIENT_ID = config.github.CLIENT_ID;
      var GITHUB_CLIENT_SECRET = config.github.CLIENT_SECRET;

      server.app = app;
      big.server = server;

      app.wss.on('connection', function connection(ws) {
        var target = ws.upgradeReq.url;
        console.log('incoming connection ->', target)
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
        console.log(new Date().toString() + ' - about to use worker', _url);
        rrequest.post(_url, { json: message }, function(err, res, body){
          ws.send(JSON.stringify(body, true, 2));
        });
      };

      //big.mode = "Offline";
      // If big is running in Offline mode, use mock sessions
      if (big.mode === "Offline") {
        console.log('Using mock sessions middleware'.blue)
        app.all("*", require('./middlewares/mockSession'));
      }

      // TODO: move passport / login callback routes to separate file
      var passport = require('passport');

      passport.use(new GitHubStrategy({
          clientID: GITHUB_CLIENT_ID,
          clientSecret: GITHUB_CLIENT_SECRET,
          callbackURL: config.github.OAUTH_CALLBACK
        },
        function(accessToken, refreshToken, profile, done) {
          process.nextTick(function () {
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
      }),
      function(req, res){
          // The request will be redirected to GitHub for authentication, so this
          // function will not be called.
      });

      var loginCallbackHandler = require('./routeHandlers/loginCallback');
      app.get('/login/github/callback',
        passport.authenticate('github', { failureRedirect: '/failed' }),
        function(req, res) {
          loginCallbackHandler(req, res);
        });

      app.get('/logout', function(req, res){
        req.session.destroy();
        req.logout();
        res.redirect("/");
      });

      function ensureAuthenticated(req, res, next) {
        if (req.isAuthenticated()) { return next(); }
        res.redirect('/login')
      }

      var hookHandler = require('./routeHandlers/hook');

      function hookHandler (req, res) {
        req.params.owner = req.params.owner.toLowerCase();
        req.params.hook = req.params.hook.toLowerCase();
        hookHandler(req, res);
      };

      var handleUser = require('./routeHandlers/user');
      app.get('/:owner', function (req, res) {
        req.params.owner = req.params.owner.toLowerCase();
        handleUser(req, res, app);
      });

      app.get('/metrics/hook/:metric', function (req, res){
        metric.get('/hook' + "/" + req.params.metric, function(err, result){
          res.writeHead(200, {
            "Content-Type": "text/plain"
          });
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

      app.post('/:owner', function (req, res){
        req.params.owner = req.params.owner.toLowerCase();
        res.end(req.params.owner);
      });

      var handleDelete = require('./routeHandlers/hookDelete');
      var handleResource = require('./routeHandlers/hookResource');
      var handlePackage = require('./routeHandlers/hookPackage');
      var handleSource = require('./routeHandlers/hookSource');
      var handleView = require('./routeHandlers/hookView');
      var handlePresenter = require('./routeHandlers/hookPresenter');
      var handleLogs = require('./routeHandlers/hookLogs');
      var handleEvents = require('./routeHandlers/hookEvents');
      var handleModules = require('./routeHandlers/modules');
      var handleRefresh = require('./routeHandlers/refresh');

      app.get("/modules/install", function(req, res){
        handleModules(req, res);
      });

      app.get('/modules/installed', function (req, res){
        modules.all({ status: 'installed' }, function(err, result){
          res.writeHead(200, {
            "Content-Type": "text/plain"
          });
          res.end(JSON.stringify(result, true, 2));
        });
      });

      app.get('/modules/pending', function (req, res){
        modules.all({ status: 'pending' }, function(err, result){
          res.writeHead(200, {
            "Content-Type": "text/plain"
          });
          res.end(JSON.stringify(result, true, 2));
        })
      });

      app.get('/modules/errored', function (req, res){
        modules.all({ status: 'errored' }, function(err, result){
          res.writeHead(200, {
            "Content-Type": "text/plain"
          });
          res.end(JSON.stringify(result, true, 2));
        })
      });

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

      app.get('/:owner/:hook/admin', function (req, res){
        req.params.owner = req.params.owner.toLowerCase();
        req.params.hook = req.params.hook.toLowerCase();
        return res.redirect(config.baseUrl + '/admin?owner=' + req.params.owner + '&name=' + req.params.hook + '');
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
        return res.redirect(config.baseUrl + "/" +  req.params.owner + '/' + req.params.hook + '?fork=true');
      });

      app.post('/:owner/:hook/fork', function (req, res){
        req.params.owner = req.params.owner.toLowerCase();
        req.params.hook = req.params.hook.toLowerCase();
        return res.redirect(config.baseUrl + "/" +  req.params.owner + '/' + req.params.hook + '?fork=true');
      });

      app.post('/:owner/:hook/admin', function (req, res){
        req.params.owner = req.params.owner.toLowerCase();
        req.params.hook = req.params.hook.toLowerCase();
        return res.redirect(config.baseUrl + '/admin?owner=' + req.params.owner + '&name=' + req.params.hook + '');
      });

      /* TODO: enable stande-alone editor
      app.get('/:owner/:hook/editor', function (req, res){
        app.view.editor.index.present({ request: req, response: res }, function(err, html){
          console.log(err)
          res.end(html);
        });
      });
      */

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

      app.use(server.handle404);
      cb(null, app);
    });    
  });


};

server.handle404 = function handle404 (req, res) {
  server.app.view['404'].present({
    request: req,
    response: res
  }, function (err, html){
    res.writeHead(404);
    res.end(html);
  })
};


// TODO: this should be part of the resource library
// see: https://github.com/bigcompany/resource/issues/33
function initCouchDatabase (cb) {
  var nano = require('nano')('http://' + config.couch.username + ":" + config.couch.password + "@" + config.couch.host + ':' + config.couch.port);
  //var db = nano.use(config.couch.database);
  nano.db.create(config.couch.database, function (err) {
    if (err) {
      console.log('!!Cannot create couchdb ' + err.message);
    } else {
      console.log('!!Created new couchdb ' + config.couch.database)
    }
    cb(null);
  });
}