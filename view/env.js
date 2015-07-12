var user = require('../lib/resources/user');
var cache = require("../lib/resources/cache");

var bodyParser = require('body-parser');
module['exports'] = function view (opts, callback) {
  var req = opts.request, res = opts.response;
  var $ = this.$;
  if (!req.isAuthenticated()) { 
    req.session.redirectTo = "/env";
    return res.redirect('/login');
  }
  
  bodyParser()(req, res, function bodyParsed(){
    mergeParams(req, res, function(){});

    var params = req.resource.params;
  
    user.find({ name: req.user.username }, function(err, results) {

      if (err) {
        return callback(null, err.message);
      }
      if (results.length === 0) {
        return callback(null, 'No user found');
      }

      var _user = results[0];

        if (params.update) {
          // update is destructive and complete
          // entire User.env will now be replaced by the contents of the form submitted
          // all old fields are deleted and replaced with new values
          _user.env = {};
          if (params.key)  {
            if (typeof params.key === "string") {
              params.key = [params.key];
            }
            if (typeof params.value === "string") {
              params.value = [params.value];
            }
            params.key.forEach(function(k, i){
              if (k.length) {
                // try to JSON.parse since value might be array or object
                var val = params.value[i];
                try {
                  val = JSON.parse(val);
                } catch (err) {
                  val = params.value[i];
                }
                // console.log('about to save', typeof val, val)
                _user.env[k] = val;
              }
            })
          }
          _user.save(function(err){
            if (err) {
              return res.end(err.message);
            }
            // update user cache
            cache.set('/user/' + _user.name, _user, function(){
              showEnv();
            });
          });
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

          callback(null, $.html());
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