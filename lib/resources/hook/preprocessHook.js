var hook = require('./');
var user = require("../user");
var config = require('../../../config');

module['exports'] = function preprocessHook (opts, userModule, callback) {
  var req = opts.req,
      res = opts.res;
  // if any number values are coming in as empty strings, remove them entirely
  // this usually means there was a form field for a number submitted without a value
  var untrustedSchema = userModule.schema || {};
  // console.log('running', opts.req.params, opts.params, opts.req.resource.params)
  // console.log('about to hook it', userModule, userModule.theme, userModule.presenter)

  if (typeof req.params.username === "undefined") {
    req.params.username = "Marak";
  }

  // load up the user who owns this hook,
  // so we can load Hook Enviroment variables
  user.find({ name: req.params.username }, function (err, _user){
    if (err) {
      // do nothing, set env to empty
      _env = {};
    } else {
      _env = _user[0].env || {};
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
          presenter = "http://hook.io/themes/simple/index.js";
        }
      }

      if (typeof presenter === "undefined" || typeof presenter !== "function") {
        presenter === config.defaultPresenter;
      }
      userModule.theme = theme;
      userModule.presenter = presenter;
      return callback(null, userModule);
    } else {
      return callback(null, opts, userModule);
    }
  });
}
