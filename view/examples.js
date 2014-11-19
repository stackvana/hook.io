module['exports'] = function (opts, callback) {
  var $ = this.$;
  return callback(null, $.html());
};