var user = require('../lib/resources/user');
var email = require('resource-email');
var config = require('../config');
var uuid = require('node-uuid');

module['exports'] = function resetPassword (opts, cb) {
  var req = opts.request,
      res = opts.response,
      params = req.resource.params,
      $ = this.$;

  // If token has been provided check if it is valid and attempt to bypass password
  if (params.t && params.t.length > 0) {
    return user.find({ token: params.t }, function(err, results){
      if (err) {
        return res.end(err.message);
      }
      if (results.length === 0) {
        return res.end('Invalid account token');
      }
      var u = results[0];
      req.session.sessionID = uuid();
      req.session.user = u.name;
      req.login(u, function(){
        req.session.user = u.name;
        // TODO: We could invalidate / regenerate user.token here to make login tokens one-time use only
        return res.redirect(301, '/account');
      });
    });
  }

  var nameOrEmail = params.email;

  if (typeof nameOrEmail === "undefined" || nameOrEmail.length === 0) {
    return res.end('email parameter is required!');
  }

  var type = "name";
  if (nameOrEmail.search('@') !== -1) {
    type = "email";
  }

  var query = {};
  query[type] = nameOrEmail;
  nameOrEmail = nameOrEmail.toLowerCase();
  user.reset({ query: query }, function (err, u) {
    if (typeof u.email === "undefined" || u.email.length === 0) {
      // else, no email was found, no password can be sent
      return res.end('email-missing');
    }

    // if user was found, check to see if they have an email

    // TODO: use before / after resource hooks for user.reset action
    email.send({
      //provider: 'sendgrid',
      provider: 'mock',
      //api_user: "abc",
      //api_key: "1234",
      to: u.email,
      from: "hookmaster@hook.io",
      subject: "hook.io password reset request",
      html: 'this is a password reset' + config.baseUrl + "/reset?t=" + u.token
    }, function (err, result) {
      if (err) {
        return res.end(err.message);
      }
      // if email is found, send reset password email
      // TODO: send partial email string back to user with ****** to show where email was sent
      res.end('email-sent');
    });
  })

};