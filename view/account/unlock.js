var metric = require('../../lib/resources/metric');
var usage = require('../../lib/resources/usage');

var psr = require('parse-service-request');
var config = require('../../config');

module['exports'] = function view (opts, callback) {
  var req = opts.req, res = opts.res, $ = this.$, params = req.resource.params;
  var out = $.html();

  // TODO: replace with API access key code
  // if not logged in, kick out
  if (!req.isAuthenticated()) { 
    req.session.redirectTo = "/account/usage";
    // TODO: actual login screen, not just homepage login
    //return callback(null, $.html());
    return res.redirect('/login');
  }

  var totals = {};

  var userName = req.session.user.toLowerCase();

  // admin override allows checking usage stats of all users
  if (params.user && userName.toLowerCase() === "marak") {
    userName = params.user.toLowerCase();
  }

  psr(req, res, function(req, res, fields){
    // if param `confirm` has been sent
    params = req.resource.params
    // TODO: reasons array parsing seems to not be working in psr or qs? needs double check
    if (params.confirm) {
      $('.unlockForm').remove();
      usage.reset({
        account: userName,
        reasons: params.reasons,
        comments: params.comments
      }, function (err, status){
        if (req.jsonResponse) {
          return res.json({ status: 'reset' });
        } else {
          $('.message').html('Your account limits have been reset!<br/> Someone from our support team is now reviewing your request. <br/>If this continues to happen please <a href="' + config.app.url + '/contact?t=Account Usage Limit Issue">Contact Support</a>.')
          callback(null, $.html());
        }
      });
    } else {
      $('.message').remove();
      callback(null, $.html());
    }
  })

};