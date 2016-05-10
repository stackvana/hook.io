// TODO: refactor whole page to accept standard object hash of values instead of key / value pair array...

var user = require('../lib/resources/user');
var cache = require("../lib/resources/cache");
var resource = require('resource');
var checkRoleAccess = require('../lib/server/routeHandlers/checkRoleAccess');
var config = require('../config');

// TODO: refactor env to be update friendly
// will need to have "undefined" or "null" determine a value should be removed from document

var psr = require('parse-service-request');

var bodyParser = require('body-parser');
module['exports'] = function view (opts, callback) {
  var req = opts.request, res = opts.response;
  var $ = this.$;
  
  // TODO: make so that env page can view without login to show autodocs
  /*
  if (!req.isAuthenticated()) { 
    req.session.redirectTo = "/env";
    return res.redirect('/login');
  }
  */
  var _user;
  //bodyParser(req, res, fun)
  bodyParser()(req, res, function bodyParsed(){
  
  psr(req, res, function (req, res){
    var params = req.resource.params;
    //console.log('params', params)
    checkRoleAccess({ req: req, res: res, role: "env::read" }, function (err, hasPermission) {
      // console.log('check for role access', err, hasPermission)
      if (!hasPermission || req.resource.owner === "anonymous") { // don't allow anonymous hook update
        if (req.jsonResponse !== true && typeof params.hook_private_key === "undefined") {
          req.session.redirectTo = "/env";
          return res.redirect('/login');
        }
        return res.end(config.messages.unauthorizedRoleAccess(req, "env::read"));
      } else {
        _user = req.resource.owner;
        next();
      }
    });

    function next () {
      // console.log('trying to find', _user);
      user.findOne({ name: _user }, function(err, _user) {
        // console.log('found old user', params)
        if (err) {
          return callback(null, err.message);
        }

        var _env = _user.env || {}; // default to empty object if no env exists
        if (params.update || req.method === "POST") {
          // update is destructive and complete
          // entire User.env will now be replaced by the contents of the form submitted
          // all old fields are deleted and replaced with new values
          // TODO: move to resource.before hooks
          checkRoleAccess({ req: req, res: res, role: "env::write" }, function (err, hasPermission) {
            // console.log('env check for role access', err, hasPermission);
            if (!hasPermission || req.resource.owner === "anonymous") { // don't allow anonymous hook update
              if (req.jsonResponse !== true && typeof params.hook_private_key === "undefined") {
                req.session.redirectTo = "/env";
                return res.redirect('/login');
              }
              return res.end(config.messages.unauthorizedRoleAccess(req, "env::write"));
            } else {
              //_user = req.resource.owner;
              _updateEnv();
            }
          });

          function _updateEnv () {
            // console.log('_updateEnv', params)
            _user.env = {};
            // new JSON based API with env property containing object hash
            if (params.env) {
              for (var k in params.env) {
                if (params.env[k] === null) {
                  delete _env[k];
                } else {
                  _env[k] = params.env[k];
                }
              }
              //_env = params.env;
            }
            // old form based API with comma delimited key / value fields
            if (params.key)  {
              if (typeof params.key === "string") {
                params.key = [params.key];
              }
              if (typeof params.value === "string") {
                params.value = [params.value];
              }
              //console.log('values', params)
              //console.log('OLD USER', _user)
              params.key.forEach(function(k, i){
                if (k.length) {
                  // try to JSON.parse since value might be array or object
                  var val = params.value[i];
                  try {
                    val = JSON.parse(val);
                  } catch (err) {
                    val = params.value[i];
                  }
                  // TODO: fix merging from /env form, delete undefined keys..s.
                  if (val === null && typeof val !== "undefined") {
                    delete _env[k];
                  } else {
                    _env[k] = val;
                  }
                }
              });
              // console.log('about to save', _env )
            }

            _user.env = _env;

            // console.log('making save to user', _user)
            _user.save(function(err){
              if (err) {
                return res.end(err.message);
              }
              // update user cache
              cache.set('/user/' + _user.name, _user, function() {
                resource.emit('env::write', {
                  ip: req.connection.remoteAddress,
                  owner: req.session.user,
                  url: req.url
                });
                if (req.jsonResponse) {
                  return res.json(_user.env);
                } else {
                  showEnv(true);
                }
              });
            });
          } 
        } else {
          showEnv();
        }

        function quoteattr(s, preserveCR) {
            preserveCR = preserveCR ? '&#13;' : '\n';
            return ('' + s) /* Forces the conversion to string. */
                .replace(/&/g, '&amp;') /* This MUST be the 1st replacement. */
                .replace(/'/g, '&apos;') /* The 4 other predefined entities, required. */
                .replace(/"/g, '&quot;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                /*
                You may add other replacements here for HTML only 
                (but it's not necessary).
                Or for XML, only if the named entities are defined in its DTD.
                */ 
                .replace(/\r\n/g, preserveCR) /* Must be before the next replacement. */
                .replace(/[\r\n]/g, preserveCR);
                ;
        }

        function showEnv () {
          var env = _user.env || {};
          function addRow (k, v) {
            if (typeof v === "object") {
              v = JSON.stringify(v);
            }
            var _delete = '<a href="#remove" class="removeKey">X</a>';
            var _key = '<input name="key" type="text" value="' + k + '" size="20"/>';
            var _value = '<input name="value" type="text" value="' + quoteattr(v) + '" size="60"/>';
            $('.env').append('<tr><td>' + _delete + '</td><td>' + _key + '</td><td>' + _value + '</td></tr>');
          };
          if (Object.keys(env).length === 0) {
            addRow('', '');
          }
          Object.keys(env).forEach(function(key){
            addRow(key, env[key]);
          });

          resource.emit('env::read', {
            ip: req.connection.remoteAddress,
            owner: req.session.user,
            url: req.url
          });
          if (req.jsonResponse) {
            return res.json(_user.env);
          }
          callback(null, $.html());
        }

      });

    }

  });
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