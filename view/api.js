module['exports'] = function view (opts, callback) {
  var req = opts.request
      $ = this.$;
  $ = req.white($);
  return callback(null, $.html());
};