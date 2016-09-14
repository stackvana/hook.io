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
//var mergeParams = require('../../view/mergeParams');
var checkRoleAccess = require('../server/routeHandlers/checkRoleAccess');
keys.setUser(user);


var i18n = require('i18n-2')
var bodyParser = require('body-parser');
var colors = require('colors');
var fs = require('fs');
var pool = config.workers;

// var trycatch = require('trycatch');
var server = {};
module['exports'] = server;
var jsonParser = bodyParser.json();

var sslKeyDirectory = config.sslKeyDirectory;

var oys = require('oys');

var client = oys.createClient({
  oys_private_key: config.oys_private_key,
  host: 'localhost',
  port: 4000,
  protocol: "http"
});

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

        var loginCallbackHandler = require('../server/routeHandlers/loginCallback');
        app.get('/login/github/callback',
          passport.authenticate('github', { failureRedirect: '/failed' }),
          function(req, res) {
            loginCallbackHandler(req, res);
          });

        app.get('/logout', function(req, res){
          req.session.user = "anonymous";
          req.session.destroy();
          req.logout();
          res.redirect("/");
        });


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
          res.end(req.params.owner);
        });

        var handleDelete = require('../server/routeHandlers/hookDelete');
        var handleResource = require('../server/routeHandlers/hookResource');
        var handlePackage = require('../server/routeHandlers/hookPackage');
        var handleSource = require('../server/routeHandlers/hookSource');
        var handleSrc = require('../server/routeHandlers/hookSrc');

        var handleView = require('../server/routeHandlers/hookView');
        var handlePresenter = require('../server/routeHandlers/hookPresenter');
        var handleLogs = require('../server/routeHandlers/hookLogs');

        var handleEvents = require('../server/routeHandlers/hookEvents');
        var handleModules = require('../server/routeHandlers/modules');
        var handleRefresh = require('../server/routeHandlers/refresh');

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
          hook.findOne({ name: req.params.hook, owner: req.params.owner }, function(err, _u) {
            if (err) {
              return res.end(err.message);
            }
            var nanoConfig = 'http://' + config.couch.username + ":" + config.couch.password + "@" + config.couch.host + ":" + config.couch.port;
            var nano = require('nano')(nanoConfig);
            var HookDB = nano.use('hook');
            HookDB.get(_u.id, { revs_info: true, /*, include_docs: false */ }, function(err, body) {
              if (err) {
                return res.end(err.message);
              }
              // show all revs as JSON or HTML list
              if (req.jsonResponse === true) {
                res.json(body._revs_info, true, 2);
              } else {
                var str = '';
                body._revs_info.forEach(function(rev){
                  if (rev.status === "available") {
                    var url = '/' + req.params.owner + '/' + req.params.hook + '?_rev=' + rev.rev;
                    str += '<a href="' + url +'">' + rev.rev + '</a><br/>'
                  }
                })
                res.end(str);
              }
            });
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

        app.get('/:owner/:hook/_src', function (req, res){
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

        app.use(server.handle404);
        cb(null, app);

      });
    }

  });

};

server.handle404 = function handle404 (req, res) {
  //return res.end('404');
  server.app.view['404'].present({
    request: req,
    response: res,
    req: req,
    res: res
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