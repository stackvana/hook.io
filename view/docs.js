module['exports'] = function doc (opts, callback) {
  var $ = this.$;
  return callback(null, $.html());
};