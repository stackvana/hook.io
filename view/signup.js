var hook = require("../lib/resources/hook");
var user = require("../lib/resources/user");
var bodyParser = require('body-parser');
var mergeParams = require('merge-params');
var config = require('../config');
var themes = require('../lib/resources/themes');

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

  bodyParser()(req, res, function bodyParsed(){
    mergeParams(req, res, function(){});
    var params = req.resource.params;
    var email = params.email;
    if(typeof email === "undefined" || email.length < 3) {
      return res.end('invalid');
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
        var str = "exists";
        return res.end(str);
      }
      
      var data = {};
      if (type === "email") {
        data.email = email;
        data.name = slug(email);
      } else {
        data.name = email;
      }
      
      if (data.type === "name" && typeof params.password === "undefined" || typeof params.email === "undefined") {
        return res.end('available');
      } else {

        data.password = params.password;
        // todo: use user.signup
        if (results.length === 0 && typeof params.password !== "undefined" && params.password.length !== 0 && (params.password === params.confirmPassword)) {
          // ready to signup new user...
          // do nothing?
        } else {
          // can't signup user, something wrong with first password
          // somewhat non-descriptive error here
          // client mostly handles this first
          return res.end('available');
        }
        return user.create(data, function (err, result){
          if (err) {
            return res.end(err.stack);
          }
          // todo: set token here
          req.login(result, function(err){
            if (err) {
              return res.end(err.message);
            }
            req.session.user = result.name.toLowerCase();
            var r = {
              res: "valid",
            };
            // r.res = "redirect";
            r.redirect = req.session.redirectTo || "/";
            return res.end(JSON.stringify(r));
          });
        });
      }
    });
  });

};