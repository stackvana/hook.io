// TODO: remove copy-pasta from env.js

var user = require('../lib/resources/user');
var bodyParser = require('body-parser');
module['exports'] = function view (opts, callback) {
  var req = opts.request, res = opts.response;
  var $ = this.$;
  if (!req.isAuthenticated()) { 
    req.session.redirectTo = "/domains";
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
      console.log('we have ', _user.domains.items)
        if (params.update) {
          // update is destructive and complete
          // entire User.env will now be replaced by the contents of the form submitted
          // all old fields are deleted and replaced with new values
          //_user.env = {};
          if (params.key)  {
            if (typeof params.key === "string") {
              params.key = [params.key];
            }
            if (typeof params.value === "string") {
              params.value = [params.value];
            }
            params.key.forEach(function(k, i){
              if (k.length) {
                // console.log('about to save', typeof val, val)
                _user.domains.items.push(k);
              }
            })
          }
          _user.save(function(err){
            if (err) {
              return res.end(err.message);
            }
            showEnv();
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
          var env = _user.domains.items || [];
          function addRow (k, v) {
            if (typeof v === "object") {
              v = JSON.stringify(v);
            }
            var _delete = '<a href="#remove" class="removeKey">X</a>';
            var _key = '<input name="key" type="text" value="' + k + '" size="20"/>';
            var _value = '<input name="value" type="text" value="' + quoteattr(v) + '" size="60"/>';
            $('.env').append('<tr><td>' + _delete + '</td><td>' + k + '</td></tr>');
          };
          
          if (env.length === 0) {
            addRow('', '');
          }

          env.forEach(function(key){
            console.log('ff', key)
            addRow(key.id);
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