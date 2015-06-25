var hook = require("../lib/resources/hook")
var bodyParser = require('body-parser');
var config = require('../config');

// lookup themes from curated theme list
// TODO: Create "themes" resource and persist this to database
var themes = {
  "debug": {
    "theme": config.defaultTheme,
    "presenter": config.defaultPresenter
  },
  "simple": {
    "theme": "http://hook.io/themes/simple/index.html",
    "presenter": "http://hook.io/themes/simple/index.js"
  },
  "simple-form": {
    "theme": "http://hook.io/themes/simple-form/index.html",
    "presenter": "http://hook.io/themes/simple-form/index.js"
  },
  "none": {
    "theme": "http://hook.io/themes/none/index.html",
    "presenter": "http://hook.io/themes/none/index.js"
  },
  "custom": {
    "theme": "",
    "presenter": ""
  }
};

module['exports'] = function view (opts, callback) {
  var req = opts.request,
      res = opts.response;
  
  var $ = this.$,
  self = this;
  
  if (!req.isAuthenticated()) { 
    req.session.redirectTo = "/new";
    return res.redirect('/login');
  }
  var user = req.user.username;
  bodyParser()(req, res, function bodyParsed(){
    mergeParams(req, res, function(){});
    var params = req.resource.params;
    var gist = params.gist;
    // load gist embed based on incoming gist url parameter

    if (params.create) {
      
      if (params.name.length === 0) {
        return res.end('Hook name is required!');
      }
      
      // do not recreate hooks that already exist with that name
      params.owner = user || "Marak"; // hardcode Marak for testing
      
      var query = { name: params.name, owner: req.user.username };
      return hook.find(query, function(err, results){
        if (results.length > 0) {
          var h = results[0];
          return res.redirect('/' + h.owner + "/" + h.name + "?alreadyExists=true");
        }
        params.cron = params.cronString;

        return hook.create(params, function(err, result){
          if (err) {
            return callback(null, err.message);
          }
          
          var h = result;
          req.hook = h;
          
          // fetch the hook from github and check if it has a schema / theme
          // if so, attach it to the hook document

          opts.gist = gist;
          opts.req = opts.request;
          opts.res = opts.response;
          hook.fetchHookSourceCodeFromGithub(opts, function(err, code){
            if (err) {
              return opts.res.end(err.message);
            }
            hook.attemptToRequireUntrustedHook(opts, function(err, _module){
              if (err) {
                return opts.res.end(hook.formatError(err))
              }
              h.mschema = _module.schema;
              h.theme = _module.theme;
              h.presenter = _module.presenter;
              h.save(function(){
                // redirect to new hook friendly page
                return res.redirect('/' + h.owner + "/" + h.name + "?created=true");
                //return callback(null, JSON.stringify(result, true, 2));
              });
              
            });
            
          });
          
        });
        
      });
    }

    self.parent.components.themeSelector.present({}, function(err, html){
      var el = $('.themeSelector')
      el.html(html);
      callback(null, $.html());
    })

  });

};


//
// Middleware for merging all querystring / request.body and route parameters,
// into a common scope bound to req.resource.params
//
function mergeParams (req, res, next) {

  req.resource = req.resource || {};
  req.resource.params = {};
  req.body = req.body || {};

  //
  // Iterate through all the querystring and request.body values and
  // merge them into a single "data" argument
  //
  if (typeof req.params === 'object') {
    Object.keys(req.params).forEach(function (p) {
      req.resource.params[p] = req.param(p);
    });
  }

  if (typeof req.query === 'object') {
    Object.keys(req.query).forEach(function (p) {
      req.resource.params[p] = req.query[p];
    });
  }

  Object.keys(req.body).forEach(function (p) {
    req.resource.params[p] = req.body[p];
  });

  next();
}