var config = require("../config");

module['exports'] = function view (opts, callback) {
  var $ = this.$, req = opts.req;
  var appName = req.hostname;
  // if paid account
  // $('.freeAccount').remove();
  var out = $.html();
  out = out.replace('{{stripePK}}', config.stripe.publicKey);
  out = out.replace(/\{\{appName\}\}/g, appName);
  callback(null, out);
};