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

    app.get('/login/callback', 
      passport.authenticate('github', { failureRedirect: '/failed' }),
      function(req, res) {
        var referredBy = req.session.referredBy || ""; 
        req.session.user = req.user.username;
        user.find({ name: req.user.username }, function (err, result){
          if (err) { 
            return res.end(err.message);
          }

          // increment total logins metric for user
          metric.incr("/user/" + req.user.username + "/logins");

          if (result.length === 0) {
            // TODO: this validation should be handled by mschema
            // see: https://github.com/mschema/mschema/issues/9
            // see: https://github.com/mschema/mschema/issues/10
            var mail = "";
            try {
              mail = req.user.emails[0].value || "";
              if (mail === null) { 
                mail = ""; 
              }
            } catch(err) {
              // do nothing
            }
            user.create({ name: req.user.username, email: mail, referredBy: referredBy }, function(err, result){
              if (err) { 
                return res.end(err.message);
              }
              return res.redirect(req.session.redirectTo || "/");
            })
          } else {
            return res.redirect(req.session.redirectTo || "/");
          }
        });
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

    function hookHandler (req, res) {
      mergeParams(req, res, function(){
        if (req.resource.params.fork) {
          return hook.fork(req, res);
        }
        // if ?delete=true has been passed to the hook,
        // attempt to destroy the hook
        if (req.resource.params.delete) {
          var user = req.session.id;
          if (typeof req.session.user !== 'undefined') {
            user = req.session.user.toLowerCase();
          }

          // check the owner of the hook versus the current session,
          // if the session does not match the owner, do not allow hook to be deleted
          if (req.params.username.toLowerCase() === user) {
            return hook.find({owner: req.params.username, name: req.params.hook }, function (err, result){
              if (err) {
                return res.end(err.message);
              }
              if (result.length === 0) {
                return res.end('Not found');
              }
              var h = result[0];
              return h.destroy(function(err){
                if (err) {
                  return res.end(err.message);
                }
                // also remove from cache
                cache.set('/hook/' + req.params.username + '/' + req.params.hook, null, function (){
                  return res.end('deleted ' + h.owner + "/" + h.name);
                });
              });
            });
          } else {
            return res.end(user + ' does not have the permission to destroy ' + req.params.username + "/" + req.params.hook);
          }
        }
        // run hook on remote worker
        return hook.runRemote(req, res, function(){
          // do nothing with the result
          // if the hook has been properly formatted, it should be able to call res.write res.end on it's own
        });
      })
      
    };

    app.get('/:username', function (req, res){
      // get all hooks for this user
      hook.find({owner: req.params.username }, function (err, result){
        if (err) {
          return res.end(err.message);
        }
        if (result.length === 0) {
          return handle404(req, res);
        }
        app.view.hooks.present({
          hooks: result,
          request: req,
          response: res
        }, function(err, html){
          res.end(html);
        });
      });
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

    function handleSource (req, res) {
      return hook.find({owner: req.params.username, name: req.params.hook }, function (err, result){
        if (err) {
          return res.end(err.message);
        }
        if (result.length === 0) {
          return res.end('Not found');
        }
        var h = result[0];
        req.hook = h;
        hook.fetchHookSourceCodeFromGithub({ gist: h.gist, req: req, res: res }, function(err, code){
          if (err) {
            return res.end(err.message);
          }
          return res.end(code)
        });
      });
    }

    function handleView (req, res) {
      return hook.find({owner: req.params.username, name: req.params.hook }, function (err, result){
        if (err) {
          return res.end(err.message);
        }
        if (result.length === 0) {
          return res.end('Not found');
        }
        var h = result[0];
        req.hook = h;
        hook.fetchHookTheme({ req: req, res: res }, h.theme, function(err, _theme){
         if (err) {
            return res.end(err.message);
          }
          return res.end(_theme)
        });
      });
    }

    function handlePresenter (req, res) {
      return hook.find({owner: req.params.username, name: req.params.hook }, function (err, result){
        if (err) {
          return res.end(err.message);
        }
        if (result.length === 0) {
          return res.end('Not found');
        }
        var h = result[0];
        req.hook = h;
        hook.fetchHookPresenter({ req: req, res: res }, h.presenter, function(err, _presenter){
          if (err) {
            return res.end(err.message);
          }
          return res.end(_presenter.toString())
        });
      });
    }

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
    function handle404(req, res) {
      app.view['404'].present({
        request: req,
        response: res
      }, function (err, html){
        res.writeHead(404);
        res.end(html);
      })
    };
    app.use(handle404);
    cb(null, app);
  });
};