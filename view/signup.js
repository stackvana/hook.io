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

    // if email is invalid
    if(typeof email === "undefined" || email.length < 3) {
      var r = {
        result: 'invalid'
      };
      return res.json(r);
    }

    // TODO: validate email?

    // if an valid email has been provided
    email = email.toLowerCase();

    // attempt to find if email conflicts with existing user
    return user.find({ email: email }, function (err, results) {
      if (err) {
        return res.end(err.stack);
      }
      // if user exists, abort
      if (results.length > 0) {
        var r = {
          result: "exists"
        };
        return res.json(r);
      }
      // TODO: remove legacy code for auto username
      var data = {};
      data.type = "email"
      data.email = email;

      // create the new hook.io user with email address
      return user.create(data, function (err, u) {
        if (err) {
          err.message = JSON.parse(err.message)
          var r = {
            result: "error",
            error: true,
            message: err.message.errors[0].message
          };
          res.status(500);
          return res.json(r);
        }
        user.login({ req: req, res: res, user: u }, function (err) {
          var r = {
            result: "valid",
          };
          // r.res = "redirect";
          r.redirect = req.session.redirectTo || "/services";
          // if json response, send back json message
          if (req.jsonResponse) {
            return res.json(r);
          } else {
          // if not json response, assume browser and redirect to logged in `/services` page
            return res.redirect(r.redirect);
          }
        });
      });
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