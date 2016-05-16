var user = require('../lib/resources/user');
var passport = require('passport');

var psr = require('parse-service-request');

module['exports'] = function view (opts, callback) {

  var $ = this.$;

  var req = opts.request,
      res = opts.response;

  $ = req.white($);

  psr(req, res, function(req, res) {
    var params = req.resource.params;
    if (params.name && params.password) {
      params.name = params.name.toLowerCase();
      var type = "name";
      // determine if username or email
      if (params.name.search('@') !== -1) {
        type = "email";
      }
      var query = {};
      query[type] = params.name;
      user.find(query, function (err, results) {
        if (err) {
          return res.end(err.message);
        }
        if (results.length === 0) {
          req.session.user = params.name;
          var r = {
            result: "available",
          };
          return res.json(r);
        }
        var u = results[0];
        var crypto = require('crypto');
        var hash = crypto.createHmac("sha512", u.salt).update(params.password).digest("hex");
        if (hash !== u.password) {
          var r = {
            result: "invalid",
          };
          if (u.githubOauth === true) {
            r.result = "redirect";
            r.redirect = "/login/github";
            return res.redirect(r.redirect);
            // if the user has already oauthed with github before,
            // and is attempting to sign in with a bad password,
            // lets just redirect them to the github auth! easy.
          }
          return res.end(JSON.stringify(r));
        }
        req.login(u, function(err){
          if (err) {
            return res.end(err.message);
          }
          req.session.user = u.name.toLowerCase();
          req.session.paidStatus = u.paidStatus;
          req.session.email = u.email;
          var r = {
            result: "valid",
          };
          user.emit('login', u);
          r.redirect = req.session.redirectTo || "/services";
          if (req.jsonResponse) {
            return res.json(r);
          } else {
            return res.redirect(r.redirect);
          }
        });
      });
    } else {
      if (req.jsonResponse) {
        return res.json({ status: 'invalid', message: 'name and email required'});
      } else {
        return callback(null, $.html());
      }
    }
  });

};