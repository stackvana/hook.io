var config = require("../config");

module['exports'] = function view (opts, callback) {
  var $ = this.$;
  var out = $.html();
  out = out.replace('{{stripePK}}', config.stripe.publicKey);
  callback(null, out);
};