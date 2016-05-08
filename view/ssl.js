module['exports'] = function view (opts, callback) {
  var $ = this.$, req = opts.req;
  $ = req.white($);
  callback(null, $.html());
};