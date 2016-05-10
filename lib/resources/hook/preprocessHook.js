// TODO: remove this file
// move env code to new module
// move theme presenter code to appropiate modules

var hook = require('./');
var user = require("../user");
var keys = require("../keys");
var cache = require("../cache");
var config = require('../../../config');
var Route = require('route-parser');
var role = require('../role');

module['exports'] = function preprocessHook (opts, userModule, callback) {
  var req = opts.req,
      res = opts.res;
  // if any number values are coming in as empty strings, remove them entirely
  // this usually means there was a form field for a number submitted without a value
  var untrustedSchema = userModule.schema || {};
  // console.log('running', opts.req.params, opts.params, opts.req.resource.params)
  // console.log('about to hook it', userModule, userModule.theme, userModule.presenter)

  if (typeof req.params.owner === "undefined") {
    req.params.owner = "marak";
  }

  // load up the user who owns this hook,
  // so we can load Hook Enviroment variables
  var key = '/user/' + req.params.owner;
  cache.get(key, function (err, _user) {
    if (_user === null) {
      findUser(function(err, u){
        cache.set(key, u[0], function(){
          finish(err, u[0]);
        });
      });
    } else {
      finish(null, _user);
    }
  });

  // if a Hook.path is defined and there is a wildcard route present
  if (typeof req.hook.path !== "undefined" && req.hook.path.length > 0 
     && typeof req.params["0"] !== "undefined" && req.params["0"].length > 0) {
     // attempt to match wildcard route ( recieved after /:owner/:hook/* ) against Hook.path
     var route = new Route(req.hook.path);
     var routeParams = route.match("/" + req.params["0"]);
     // if no route match is found, 404 with a friendly error
     if (routeParams === false) {
       res.writeHead(404);
       // TODO: make error customizable
       res.end('Invalid path: ' + req.params["0"] + ' does not match ' + req.hook.path);
       return;
     }
     // route matches, map route parameters to resource scope
     for (var p in routeParams) {
       req.resource.params[p] = routeParams[p];
     }
  }

  function findUser (cb) {
    user.find({ name: req.params.owner }, function (err, _user) {
      var r = _user[0];
      if (typeof r.hookAccessKey === "undefined" || r.hookAccessKey.length === 0) {
        keys.create({
           name: "api-access-key",
           owner: r.name,
           key_type: "internal",
           roles: Object.keys(role.roles)
         }, function (err, k) {
           if (err) {
             console.log('Error: ', err.message);
             return;
             //return next(err);
           }
           var _update = {
             id: r.id,
             hookAccessKey: k.hook_private_key
           };
           // console.log('attemping to update user', _update)
           user.update(_update, function(err, re){
             if (err) {
               console.log('Error: ', err.message);
             }
             cb(err, re);
           });
         });
      }
      else {
        cb(err, _user);
      }

    });
  };

  function finish (err, _user) {
    var _env = {};
    _user = _user || {};
    // since we probably have a user document for the owner the service,
    // might as well attach a copy of it to the request for later usage
    req._user = {
      name: _user.name,
      hookAccessKey: _user.hookAccessKey
    };
    if (err) {
      // do nothing, set env to empty
      _env = {};
    } else {
      _env = _user.env || {};
      var keys = Object.keys(_env).sort();
      var __env = {};
      keys.forEach(function(k){
        __env[k] = _env[k];
      });
      _env = __env;
    }
    req.env = _env;
    // loadTheme
    if (userModule.theme && userModule.theme.length > 0) {

      var theme, presenter;

      theme = userModule.theme || config.defaultTheme;
      presenter = userModule.presenter || config.defaultPresenter

      // if a theme was set ( not the default debug theme, and no presenter was given, use simple.js )
      if (typeof theme === "undefined" || theme.length === 0) {
        theme = config.defaultTheme;
        if (typeof presenter === "undefined" || typeof presenter !== "function") {
          presenter = "https://hook.io/themes/simple/index.js";
        }
      }

      if (typeof presenter === "undefined" || typeof presenter !== "function") {
        presenter === config.defaultPresenter;
      }
      userModule.theme = theme;
      userModule.presenter = presenter;
      return callback(null, userModule);
    } else {
      return callback(null, userModule);
    }
  };

}
