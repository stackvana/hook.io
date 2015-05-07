var big = require('big');

var request = require("hyperquest");
var http = require('resource-http');
var hook = require('./resources/hook');
var user = require('./resources/user');
var billing = require('./resources/billing');
var domain = require('./resources/domain');
var config = require('../config');
var mergeParams = require('../view/mergeParams');
var bodyParser = require('body-parser');
var fs = require('fs');

var server = {};
module['exports'] = server;

var jsonParser = bodyParser.json();

server.start = function start (opts, cb) {

  hook.persist(config.couch);
  user.persist(config.couch);
  billing.persist(config.couch);
  domain.persist(config.couch);

  var passport = require('passport'),
  GitHubStrategy = require('passport-github').Strategy;

  var key = fs.readFileSync(__dirname + "/../ssl/server.key").toString();
  var cert = fs.readFileSync(__dirname + "/../ssl/server.crt").toString();
  var ca = [fs.readFileSync(__dirname + '/../ssl/gd1.crt').toString(), fs.readFileSync(__dirname + '/../ssl/gd2.crt').toString(), fs.readFileSync(__dirname + '/../ssl/gd3.crt').toString()]
  big.spawn('website', {
    site: {
      enableUploads: false,
      root: __dirname + '/../public',
      view: __dirname + '/../view',
      passport: true,
      port: config.site.port,
      https: config.site.https,
      cert: cert,
      key: key,
      ca: ca

    }
  }, function (err, app){

    var GITHUB_CLIENT_ID = config.github.CLIENT_ID;
    var GITHUB_CLIENT_SECRET = config.github.CLIENT_SECRET;


    /*

    // TODO: make mock session configurable
    app.all("*", function(req, res, next) {
      console.log('using mock middle')
      req.isAuthenticated = function() {
       return true;
      };
      req.user = {
        username: "Marak"
      };
      next();
    });
    // TODO: END MOCK SESSION CODE
    */

    app.all("*", function(req, res, next) {
      // console.log('using domain routing middleware')
      // console.log(req.host, req.url.blue)
      //
       // enables custom domain routing
       // EASYTODO: move this into separate module
       //
       if ( req.host !== "hook.io" &&
            req.host !== "www.hook.io" &&
            req.host !== "localhost" &&
            req.host !== "127.0.0.1"
           ) {
         // if the req.host doesn't match the main site, assume its a custom domain
         // perform domain name lookup
         console.log('attempting to find custom domain', req.host)
         domain.find({ name: req.host }, function (err, results) {
           if (err) {
             return res.end(err.stack);
           }
           if (results.length === 0) {
             // domain not found, do nothing
             return res.end('cannot find custom domain ' + req.host);
           } else {
             var result = results[0];
             // TODO: domain found, show the root for that user
             return res.end('found custom domain' + result.name);
           }
         });
       } else {
         next();
       }
       //
       // end custom domain routing
       //
    });

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
      res.redirect('/');
    });

    function ensureAuthenticated(req, res, next) {
      if (req.isAuthenticated()) { return next(); }
      res.redirect('/login')
    }

    function hookHandler (req, res) {
      console.log('hookHandler', req.url, req.method)
      mergeParams(req, res, function(){
        if (req.resource.params.fork) {
          return hook.fork(req, res);
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

    app.post('/:username', function (req, res){
      res.end(req.params.username);
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