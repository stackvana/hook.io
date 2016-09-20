var user = require('../lib/resources/user');
var cache = require("../lib/resources/cache");
var resource = require('resource');
var checkRoleAccess = require('../lib/server/routeHandlers/checkRoleAccess');
var config = require('../config');
var psr = require('parse-service-request');

module['exports'] = function view (opts, callback) {
  var req = opts.request, res = opts.response;
  var $ = this.$;

  var _user;
  psr(req, res, function (req, res, fields){
    var params = req.resource.params;

    checkRoleAccess({ req: req, res: res, role: "env::read" }, function (err, hasPermission) {
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
            _user.env = {};
            // new JSON based API with env property containing object hash
            if (params.env) {
              for (var k in params.env) {
                if (params.env[k] === null || params.env[k] === "null") {
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

              params.key.forEach(function (k, i) {
                if (k.length) {
                  // try to JSON.parse since value might be array or object
                  var val = params.value[i];
                  try {
                    val = JSON.parse(val);
                  } catch (err) {
                    val = params.value[i];
                  }
                  // TODO: fix merging from /env form, delete undefined keys..s.
                  if (val === null || typeof val === "undefined") {
                    delete _env[k];
                  } else {
                    _env[k] = val;
                  }
                }
              });
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
                  return res.json({ status: 'updated'});
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
            var _key = '<input name="key" class="key" type="text" value="' + k + '" size="20"/>';
            var _value = '<input name="value" class="value" type="text" value="' + quoteattr(v) + '" size="60"/>';
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
};
