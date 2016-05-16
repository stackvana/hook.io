var hook = require("../lib/resources/hook");
var user = require("../lib/resources/user");
var config = require('../config');
var themes = require('../lib/resources/themes');

var psr = require('parse-service-request');

var slug = require('slug');
slug.defaults.modes['rfc3986'] = {
    replacement: '-',      // replace spaces with replacement
    symbols: true,         // replace unicode symbols or not
    remove: null,          // (optional) regex to remove characters
    charmap: slug.charmap, // replace special characters
    multicharmap: slug.multicharmap // replace multi-characters
};
slug.charmap['@'] = "-";
slug.charmap['.'] = "-";

module['exports'] = function signup (opts, cb) {
  var req = opts.request,
      res = opts.response;

  var $ = this.$,
  self = this;

  psr(req, res, function (req, res) {
    var params = req.resource.params;
    var email = params.email;
    if(typeof email === "undefined" || email.length < 3) {
      var r = {
        result: 'invalid'
      };
      return res.json(r);
    }
    var type = "name";
    // determine if username or email
    if (email.search('@') !== -1) {
      type = "email";
    }
    var query = {};
    email = email.toLowerCase();
    query[type] = email;
    return user.find(query, function(err, results){
      if (err) {
        return res.end(err.stack);
      }
      if (results.length > 0) {
        var r = {
          result: "exists"
        };
        return res.json(r);
      }
      
      var data = {};
      if (type === "email") {
        data.email = email;
        data.name = slug(email);
      } else {
        data.name = email;
      }
      if (data.type === "name" && typeof params.password === "undefined" /*|| typeof params.email === "undefined"*/) {
        var r = {
          result: "available"
        };
        return res.json(r);
      } else {

        data.password = params.password;
        // todo: use user.signup
        if (results.length === 0 && typeof params.password !== "undefined" && params.password.length !== 0 /*&& (params.password === params.confirmPassword) */) {
          // ready to signup new user...
          // do nothing, user.create will fire below
        } else {
          // can't signup user, something wrong with first password
          // somewhat non-descriptive error here
          // client mostly handles this first
          var r = {
            result: "available",
          };
          return res.json(r);
        }
        return user.create(data, function (err, result) {
          if (err) {
            var r = {
              result: "error",
              error: err.stack
            };
            return res.json(r);
          }
          // todo: set token here
          req.login(result, function(err){
            if (err) {
              var r = {
                result: "error",
                error: err.stack
              };
              return res.json(r);
            }
            req.session.user = result.name.toLowerCase();
            req.session.email = result.email;
            var r = {
              result: "valid",
            };
            // r.res = "redirect";
            r.redirect = req.session.redirectTo || "/services";
            //console.log('doing the redirect', r)
            user.emit('login', result);
            if (req.jsonResponse) {
              return res.json(r);
            } else {
              return res.redirect(r.redirect);
            }
          });
        });
      }
    });
  });
};

module['exports'].schema = {
  "email": {
    "type": "string",
    "format": "email",
    "required": true
  }
};