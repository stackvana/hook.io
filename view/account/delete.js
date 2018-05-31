var config = require('../../config');
var email = require('resource-email');
var psr = require('parse-service-request');

module['exports'] = function (opts, cb) {
  var $ = this.$,
      req = opts.req,
      res = opts.res;

  $ = req.white($);

  var appAdminEmail = config.app.adminEmail;

  psr(req, res, function(req, res){

    if (req.method === "POST") {
      var params = req.resource.params;

      if (params.confirmDelete !== "on") {
        return res.end('error: must set confirmDelete checkbox');
      }

      var cancel = {
        user: req.session.user,
        email: req.session.email,
        reason: req.resource.params.reason,
        date: new Date()
      };

      var _config = {
        //provider: 'sendgrid',
        provider: config.email.provider,
        api_user: config.email.api_user,
        api_key: config.email.api_key,
        to: "marak.squires@gmail.com",
        from: "accounts@hook.io",
        subject: 'hook.io - delete account information',
        html: JSON.stringify(cancel, true, 2)
      };
      email.send(_config, function (err, result) {
        if (err) {
          // TODO: better errors here with /config/messages/*.js errors 
          return res.end('error communicating with mail provider ' + err.message);
        }
        $('.deleteForm').remove();
        $('.message').html('Your account deletion request is now being processed.<br/>Please <a href="' + config.app.url + '/contact?t=Account%20Deletion">contact support</a> if you have any additional questions.')
        return cb(null, $.html());
      });
    } else {
      var out = $.html();
      out = out.replace(/\{\{appAdminEmail\}\}/g, appAdminEmail);
      cb(null, out);
    }
  });

};