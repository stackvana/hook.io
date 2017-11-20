var user = require('../../resources/user');
var metric = require('../../resources/metric');

module['exports'] = function loginCallback (req, res) {

  var referredBy = req.session.referredBy || "";
  var redirectTo = req.session.redirectTo || "/services";
  // destroy req.session.user in case it's already been set
  delete req.session.user;
  req.session.user = req.user.username.toLowerCase();
  // console.log('assigning sesh', req.user)
  user.find({ name: req.session.user.toLowerCase() }, function (err, result) {
    if (err) { 
      return res.end(err.message);
    }
    // increment total logins metric for user
    // TODO: replace with metric.zincrby for logins metric
    metric.incr("/user/" + req.session.user + "/logins");

    if (result.length === 0) {
      // user cannot be paid at this point since it's a brand new account from github
      req.session.paidStatus = "unpaid";
      // TODO: this validation should be handled by mschema
      // see: https://github.com/mschema/mschema/issues/9
      // see: https://github.com/mschema/mschema/issues/10
      var mail = "";
      try {
        mail = req.user.emails[0].value || "";
        if (mail === null) { 
          mail = ""; 
        }
      } catch(err) {
        // do nothing
      }

      // what happens if we have a conflicting namespace here between github and hook.io?
      // i believe it will result in an error due to req.session.user already existing in hook.io data
      // todo: figure out a way for github users to register accounts if their github name is already taken by another user on hook.io
      user.create({
        name: req.session.user,
        email: mail,
        referredBy: referredBy,
        githubAccessToken: req.githubAccessToken
      }, function (err, u) {
        if (err) { 
          return res.end(err.message);
        }
        user.login({ req: req, res: res, user: u }, function (err) {
          req.user.accessToken = req.githubAccessToken;
          req.session.githubAccessToken = req.githubAccessToken;
          return res.redirect(redirectTo);
        });
      });
    } else {
      var u = result[0];
      u.githubAccessToken = req.githubAccessToken;
      u.save(function (err) {
        if (err) { 
          return res.end(err.message);
        }
        user.login({ req: req, res: res, user: u }, function (err) {
          req.user.accessToken = req.githubAccessToken;
          req.session.githubAccessToken = req.githubAccessToken;
          return res.redirect(redirectTo);
        });
      });
    }
  });

};