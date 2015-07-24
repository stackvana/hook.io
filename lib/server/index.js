var big = require('big');

big.mode = "Online";

var request = require("hyperquest");
var http = require('resource-http');
var hook = require('../resources/hook');
var metric = require('../resources/metric');
var cache = require('../resources/cache');
var user = require('../resources/user');
var billing = require('../resources/billing');
var domain = require('../resources/domain');
var config = require('../../config');
var mergeParams = require('../../view/mergeParams');
var bodyParser = require('body-parser');
var colors = require('colors');
var fs = require('fs');

var server = {};
module['exports'] = server;

var jsonParser = bodyParser.json();

var sslKeyDirectory = config.sslKeyDirectory;

server.start = function start (opts, cb) {

  hook.persist(config.couch);
  user.persist(config.couch);
  billing.persist(config.couch);
  domain.persist(config.couch);

  var passport = require('passport'),
  GitHubStrategy = require('passport-github').Strategy;

  var key = fs.readFileSync(sslKeyDirectory + "server.key").toString();
  var cert = fs.readFileSync(sslKeyDirectory + "server.crt").toString();
  var ca = [fs.readFileSync(sslKeyDirectory + 'gd1.crt').toString(), fs.readFileSync(sslKeyDirectory + 'gd2.crt').toString(), fs.readFileSync(sslKeyDirectory + 'gd3.crt').toString()]
  big.spawn('website', {
    site: {
      enableUploads: false,
      root: __dirname + '/../../public',
      roots: config.site.roots,
      view: __dirname + '/../../view',
      passport: true,
      port: config.site.port,
      https: config.site.https,
      cert: cert,
      key: key,
      ca: ca,
      customDomains: true
    }
  }, function (err, app) {

    var GITHUB_CLIENT_ID = config.github.CLIENT_ID;
    var GITHUB_CLIENT_SECRET = config.github.CLIENT_SECRET;

    server.app = app;

    // If big is running in Offline mode, use mock sessions
    if (big.mode === "Offline") {
      console.log('Using mock sessions middleware'.blue)
      app.all("*", require('./middlewares/mockSession'));
    }

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

    app.get('/login',
      passport.authenticate('github', {
        scope: ["gist"]
      }),
      function(req, res){
        // The request will be redirected to GitHub for authentication, so this
        // function will not be called.
      });

    var loginCallbackHandler = require('./routeHandlers/loginCallback');
    app.get('/login/callback', 
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
      hookHandler(req, res);
    };

    var handleUser = require('./routeHandlers/user');
    app.get('/:username', function (req, res) {
      handleUser(req, res, app);
    });

    app.get('/metrics/hook/:metric', function (req, res){
      metric.get('/hook' + "/" + req.params.metric, function(err, result){
        res.end(result);
      })
    });

    app.get('/metrics/:username/:hook/:metric', function (req, res){
      metric.get('/' + req.params.username + "/" + req.params.hook + "/" + req.params.metric, function(err, result){
        res.end(result);
      })
    });

    app.post('/:username', function (req, res){
      res.end(req.params.username);
    });

    var handleSource = require('./routeHandlers/hookSource');
    var handleView = require('./routeHandlers/hookView');
    var handlePresenter = require('./routeHandlers/hookPresenter');

    app.get('/:username/:hook/source', function (req, res){
      handleSource(req, res);
    });

    app.post('/:username/:hook/source', function (req, res){
      handleSource(req, res);
    });

    app.get('/:username/:hook/view', function (req, res){
      handleView(req, res);
    });

    app.post('/:username/:hook/view', function (req, res){
      handleView(req, res);
    });

    app.get('/:username/:hook/presenter', function (req, res){
      handlePresenter(req, res);
    });

    app.post('/:username/:hook/presenter', function (req, res){
      handlePresenter(req, res);
    });

    app.get('/:username/:hook/:subhook/source', function (req, res){
      handleSource(req, res);
    });

    app.post('/:username/:hook/:subhook/source', function (req, res){
      handleSource(req, res);
    });

    app.get('/:username/:hook/:subhook/view', function (req, res){
      handleView(req, res);
    });

    app.post('/:username/:hook/:subhook/view', function (req, res){
      handleView(req, res);
    });

    app.get('/:username/:hook/:subhook/presenter', function (req, res){
      handlePresenter(req, res);
    });

    app.post('/:username/:hook/:subhook/presenter', function (req, res){
      handlePresenter(req, res);
    });


    app.get('/:username/:hook', function (req, res){
      hookHandler(req, res)
    });

    app.post('/:username/:hook', function (req, res){
      hookHandler(req, res);
    });

    app.get('/:username/:hook/:subhook', function (req, res){
      hookHandler(req, res);
    });

    app.post('/:username/:hook/:subhook', function (req, res){
      hookHandler(req, res);
    });

    app.get('/logout', function (req, res) {
      delete req.session;
      req.logout();
      res.redirect('/');
    });
    app.use(server.handle404);
    cb(null, app);
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