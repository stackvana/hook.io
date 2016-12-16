module['exports'] = function view (opts, callback) {
  var req = opts.req, $ = this.$;
  var $ =  req.white($);
  callback(null, $.html());
};