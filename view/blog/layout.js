var config = require('../../config');
module['exports'] = function view (opts, callback) {
  var req = opts.req,
      $ = this.$;
  $('title').html('hook.io/blog - all things microservice, the hook.io microservice blog');


  //req.i18n.setLocale('de');
  return callback(null, $.html());
};