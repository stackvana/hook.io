var config = require('../../config');
var email = require('resource-email');

module.exports = function (opts) {
  email.send({
    //provider: 'sendgrid',
    provider: config.email.provider,
    api_user: config.email.api_user,
    api_key: config.email.api_key,
    to: 'marak.squires@gmail.com',
    from: 'alerts@hook.io',
    subject: opts.subject,
    html: 'n/a'
  }, function (err, result) {
    if (err) {
      return res.end('Error in sending email ' + err.message);
    }
  });
}