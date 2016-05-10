var user = require('../lib/resources/user');
var email = require('resource-email');
var config = require('../config');
var uuid = require('node-uuid');

module['exports'] = function resetPassword (opts, cb) {
  var req = opts.request,
      res = opts.response,
      params = req.resource.params,
      $ = this.$;
  var appName = req.hostname;
  // If token has been provided check if it is valid and attempt to bypass password
  if (params.t && params.t.length > 0) {
    return user.find({ token: params.t }, function(err, results){
      if (err) {
        return res.end(err.message);
      }
      if (results.length === 0) {
        return res.end('Invalid or expired account reset token.');
      }
      var u = results[0];
      req.session.sessionID = uuid();
      req.session.user = u.name;
      req.login(u, function(){
        req.session.user = u.name;
        // TODO: We could invalidate / regenerate user.token here to make login tokens one-time use only
        return res.redirect(301, '/account?reset=true');
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
  nameOrEmail = nameOrEmail.toLowerCase();
  query[type] = nameOrEmail;
  user.reset({ query: query }, function (err, u ) {
    if (err) {
      return res.end(err.message);
    }
    // TODO: move template to /emails folder
    // TODO: use before / after resource hooks for user.reset action
    var ip = req.connection.remoteAddress.toString();
    // TODO: add ip address, requested from: ' + ip
    var link = config.app.url + "/reset?t=" + u.token;
    var tmpl = 'A password reset for your ' + appName + ' account was requested.' + '<br/><br/>';
    tmpl += (' Account Name: ' + u.name + '<br/>');
    tmpl += (' Reset Link: <a href="' + link + '">' + link + '</a><br/>');
    // if user was found, check to see if they have an email
    email.send({
      //provider: 'sendgrid',
      provider: config.email.provider,
      api_user: config.email.api_user,
      api_key: config.email.api_key,
      to: u.email,
      from: config.app.adminEmail,
      subject: appName + " password reset request",
      html: tmpl
    }, function (err, result) {
      if (err) {
        return res.end(err.message);
      }
      // if email is found, send reset password email
      // TODO: send partial email string back to user with ****** to show where email was sent
      // TODO: obfuscate email to client with **** interpolation.
      res.end('{ "res": "email-sent", "email": "' +  u.email + '"}');
    });
  })

};