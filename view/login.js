var user = require('../lib/resources/user');

var psr = require('parse-service-request');

module['exports'] = function view (opts, callback) {

  var $ = this.$;

  var req = opts.request,
      res = opts.response;

  $ = req.white($);

  psr(req, res, function(req, res) {
    var params = req.resource.params;

    params.name = params.name || params.email;
    if (params.restricted !== 'true') {
      $('.restricted').remove();
    }

    /* we could display the intended redirect page to the user
    if (req.session.redirectTo) {
      $('.redirectPage').html(req.session.redirectTo)
    }
    */

    // if a name and password have been supplied
    if (params.name && params.password) {
      params.name = params.name.toLowerCase();
      var type = "name";
      // determine if username or email
      if (params.name.search('@') !== -1) {
        type = "email";
      }
      var query = {};
      query[type] = params.name;

      // check to see if the user email is available
      user.find(query, function (err, results) {
        if (err) {
          res.status(500);
          return res.end(err.message);
        }
        if (results.length === 0) {
          // removed this, since it seems to auto-set the user name in an unexpected / legacy way
          // req.session.user = params.name;
          var r = {
            result: "available",
          };
          return res.json(r);
        }
        var u = results[0];
        if (typeof u.salt == 'undefined') {
          if (typeof u.githubAccessToken === 'string' && u.githubAccessToken.length > 0) {
            var r = {};
            // user has logged in with github before, lets try that
            r.result = "valid";
            r.redirect = "/login/github";
            return res.json(r);
          }
          var r = {
            result: "not-set",
          };
          return res.json(r)
        }
        var crypto = require('crypto');

        var hash = crypto.createHmac("sha512", u.salt).update(params.password).digest("hex");
        if (hash !== u.password) {
          var r = {
            result: "invalid",
          };
          return res.end(JSON.stringify(r));
          // Do not attempt autologin? seems too much
          // TODO: only attempt github oauth if no password has been supplied
          if (u.githubOauth === true && typeof params.password === 'undefined') {
            r.result = "redirect";
            r.redirect = "/login/github";
            return res.redirect(r.redirect);
            // if the user has already oauthed with github before,
            // and is attempting to sign in with a bad password,
            // lets just redirect them to the github auth! easy.
          }

          // TODO: if password supplied, attempt login
          return res.end(JSON.stringify(r));
        }
        // Valid password, performing login
        return user.login({ req: req, res: res, user: u }, function (err){
          if (err) {
            return res.end(err.message);
          }
          var r = {
            result: "valid",
          };
          // is hookAccessKey already set in user.login now?
          req.session.hookAccessKey = u.hookAccessKey;
          req.session.timezone = u.timezone;
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
        if (typeof params.name === 'undefined') {
          return res.json({ status: 'invalid', message: 'name or email required'});
        } else {
          return res.json({ status: 'invalid', message: 'password required'});
        }
      } else {
        return callback(null, $.html());
      }
    }
  });

};