var email = require('resource-email');
var config = require('../config');
var psr = require('parse-service-request');

module['exports'] = function view (opts, callback) {
  var req = opts.req,
      res = opts.res,
      $ = this.$;

  // Only allow logged in users to send contact emails
  // It could be better to have the contact form not require a login, but this is necessary to help prevent email spam from bots which auto submit the contact forms
  if (!req.isAuthenticated()) {
    req.session.redirectTo = req.url;
    return res.redirect(302, '/login?restricted=true');
  }

  psr(req, res, function(){
    var params = req.resource.params;

    if ((typeof params.subject === "string" && typeof params.comment === "string") && (params.subject.length > 0 || params.comment.length > 0)) {
      var _config = {
        //provider: 'sendgrid',
        provider: config.email.provider,
        api_user: config.email.api_user,
        api_key: config.email.api_key,
        to: "marak@hook.io",
        from: params.email,
        subject: 'hook.io - contact - ' + params.accountName + '  ' + params.subject,
        html: params.comment
      };
      email.send(_config, function (err, result) {
        if (err) {
          return res.end(err.message);
        }
        $('#contactForm').remove();
        return callback(null, $.html());
      });
    } else {

      $('#email').attr('value', req.session.email);
      $('#accountName').attr('value', req.session.user);

      if (typeof params.t === "string") {
        $('#Subject').attr('value', params.t);
      }
      $('.sent').remove();
      return callback(null, $.html());
    }

  });

};